import os
import re
import uuid
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Request
from starlette.middleware.cors import CORSMiddleware

from database import db, create_indexes
from auth import (auth_router, seed_admin, get_current_user, get_optional_user, require_role)
from models import (RecipeCreate, RecipeUpdate, RatingBody, BecomeCreatorBody, SuggestDishBody,
                    PreferencesBody, ModerateBody, WeightsBody)
import ranking
import seed_data
import youtube_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("flavouria")

app = FastAPI(title="Flavouria API")
api = APIRouter(prefix="/api")

YOUTUBE_RE = re.compile(r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|shorts/))([A-Za-z0-9_-]{11})")


def extract_youtube_id(url):
    if not url:
        return None
    m = YOUTUBE_RE.search(url)
    if m:
        return m.group(1)
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url):
        return url
    return None


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def scale_quantity(qty, factor):
    """Scale a numeric ingredient quantity string by `factor`, preserving any trailing text."""
    q = (qty or "").strip()
    if not q:
        return q
    m = re.match(r"^\s*([\d]+(?:\.\d+)?(?:\s*/\s*\d+)?)", q)
    if not m:
        return q
    raw = m.group(1)
    try:
        if "/" in raw:
            a, b = raw.split("/")
            num = float(a) / float(b)
        else:
            num = float(raw)
    except (ValueError, ZeroDivisionError):
        return q
    scaled = num * factor
    if abs(scaled - round(scaled)) < 1e-9:
        val = str(int(round(scaled)))
    else:
        val = ("%.2f" % scaled).rstrip("0").rstrip(".")
    return (val + q[m.end():]).strip()


async def get_ranking_config():
    doc = await db.settings.find_one({"key": "ranking"}, {"_id": 0})
    cfg = {**ranking.DEFAULT_CONFIG}
    if doc and doc.get("value"):
        cfg.update(doc["value"])
        cfg["weights"] = {**ranking.DEFAULT_CONFIG["weights"], **doc["value"].get("weights", {})}
    return cfg


async def creators_map(ids):
    docs = await db.creators.find({"id": {"$in": list(ids)}}, {"_id": 0}).to_list(500)
    return {c["id"]: c for c in docs}


def public_creator(c):
    if not c:
        return None
    return {"id": c["id"], "slug": c["slug"], "display_name": c["display_name"],
            "avatar": c.get("avatar"), "bio": c.get("bio"),
            "rating_avg": c.get("rating_avg", 0), "rating_count": c.get("rating_count", 0),
            "recipe_count": c.get("recipe_count", 0)}


async def attach_creators(recipes):
    cmap = await creators_map({r["creator_id"] for r in recipes if r.get("creator_id")})
    for r in recipes:
        r["creator"] = public_creator(cmap.get(r.get("creator_id")))
    return recipes


# ---------------- Search ----------------
@api.get("/search")
async def search(request: Request, q: str = Query("", alias="q"), spice: str = None, diet: str = None,
                 max_time: int = None, min_time: int = None, difficulty: str = None, cuisine: str = None,
                 user=Depends(get_optional_user)):
    query = q.strip()
    filt = {"status": "PUBLISHED"}
    if query:
        tokens = ranking.tokenize(query)
        ors = []
        for tok in tokens + [query]:
            rx = re.escape(tok)
            ors.extend([
                {"title": {"$regex": rx, "$options": "i"}},
                {"tags": {"$regex": rx, "$options": "i"}},
                {"cuisine": {"$regex": rx, "$options": "i"}},
                {"region": {"$regex": rx, "$options": "i"}},
                {"category": {"$regex": rx, "$options": "i"}},
                {"ingredients.name": {"$regex": rx, "$options": "i"}},
                {"description": {"$regex": rx, "$options": "i"}},
            ])
        if ors:
            filt["$or"] = ors
    if spice:
        filt["spice_level"] = spice
    if diet:
        filt["diet"] = diet
    if difficulty:
        filt["difficulty"] = difficulty
    if cuisine:
        filt["cuisine"] = {"$regex": re.escape(cuisine), "$options": "i"}
    if max_time:
        filt["cook_time"] = {"$lte": max_time}
    if min_time:
        filt.setdefault("cook_time", {})["$gte"] = min_time

    candidates = await db.recipes.find(filt, {"_id": 0}).to_list(200)
    cfg = await get_ranking_config()
    cmap = await creators_map({c["creator_id"] for c in candidates if c.get("creator_id")})
    scored = ranking.score_recipes(candidates, query, cmap, cfg)
    if query:
        strong = [r for r in scored if r["score_breakdown"]["search_relevance"] >= 0.6]
        if len(strong) >= 3:
            scored = strong
        elif strong:
            rest = [r for r in scored if r not in strong]
            scored = strong + rest
    top = ranking.select_top_diverse(scored, 3, cfg)
    for i, r in enumerate(top):
        r["rank"] = i + 1
        r["why_its_here"] = ranking.why_its_here(r, i, top)
        r["creator"] = public_creator(cmap.get(r.get("creator_id")))

    search_id = str(uuid.uuid4())
    await db.search_events.insert_one({
        "id": search_id, "query": query, "user_id": user["id"] if user else None,
        "results_count": len(top), "selected_recipe_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"search_id": search_id, "query": query, "count": len(top), "results": top}


@api.post("/search/select")
async def search_select(body: dict, user=Depends(get_optional_user)):
    search_id = body.get("search_id")
    recipe_id = body.get("recipe_id")
    if search_id:
        await db.search_events.update_one({"id": search_id}, {"$set": {"selected_recipe_id": recipe_id}})
    if recipe_id:
        await db.recipes.update_one({"id": recipe_id}, {"$inc": {"selection_count": 1}})
    return {"ok": True}


@api.post("/suggest-dish")
async def suggest_dish(body: SuggestDishBody, user=Depends(get_optional_user)):
    await db.suggested_dishes.insert_one({
        "id": str(uuid.uuid4()), "query": body.query.strip(), "user_id": user["id"] if user else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@api.get("/youtube")
async def youtube_search(q: str = Query("", alias="q")):
    """Real-time YouTube AI recipe agent: top 3 live videos ranked by
    views + likes + comment sentiment, each with an AI summary."""
    query = q.strip()
    if not query:
        return {"query": "", "videos": []}
    return await youtube_agent.search_youtube_recipes(query)


@api.get("/youtube/saved")
async def youtube_saved(user=Depends(get_current_user)):
    docs = await db.youtube_saved.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"videos": [{**d["video"], "is_saved": True} for d in docs]}


@api.post("/youtube/save")
async def youtube_save(body: dict, user=Depends(get_current_user)):
    video = body.get("video") or {}
    vid = video.get("video_id")
    if not vid:
        raise HTTPException(status_code=400, detail="Missing video data")
    existing = await db.youtube_saved.find_one({"user_id": user["id"], "video_id": vid})
    if existing:
        await db.youtube_saved.delete_one({"_id": existing["_id"]})
        return {"saved": False}
    await db.youtube_saved.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "video_id": vid, "video": video,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"saved": True}


@api.get("/explore")
async def explore(q: str = "", skip: int = 0, limit: int = 6):
    """Paginated community recipes matching a query — powers the 'More Recipes' reveal.
    Uses the Flavouria relevance score so results stay on-topic (no cross-dish noise)."""
    query = q.strip()
    filt = {"status": "PUBLISHED"}
    if query:
        ors = []
        for tok in ranking.tokenize(query) + [query]:
            rx = re.escape(tok)
            ors.extend([
                {"title": {"$regex": rx, "$options": "i"}},
                {"tags": {"$regex": rx, "$options": "i"}},
                {"cuisine": {"$regex": rx, "$options": "i"}},
                {"region": {"$regex": rx, "$options": "i"}},
                {"category": {"$regex": rx, "$options": "i"}},
                {"ingredients.name": {"$regex": rx, "$options": "i"}},
            ])
        if ors:
            filt["$or"] = ors
    candidates = await db.recipes.find(filt, {"_id": 0}).to_list(300)
    if query:
        cfg = await get_ranking_config()
        cmap = await creators_map({c["creator_id"] for c in candidates if c.get("creator_id")})
        scored = ranking.score_recipes(candidates, query, cmap, cfg)
        relevant = [r for r in scored if r["score_breakdown"]["search_relevance"] >= 0.5]
        ordered = relevant if relevant else scored
    else:
        ordered = sorted(candidates, key=lambda r: r.get("rating_count", 0), reverse=True)
    total = len(ordered)
    page = ordered[skip:skip + limit]
    await attach_creators(page)
    return {"total": total, "recipes": page, "skip": skip, "limit": limit}


@api.get("/meal-plan")
async def meal_plan(q: str = Query("", alias="q"), pax: int = 2):
    """Plan your Meal: find the best-matching recipe for a dish and return a shopping
    list with each ingredient's quantity scaled to the requested number of people."""
    query = q.strip()
    if not query:
        return {"found": False, "query": query, "pax": pax}
    pax = max(1, min(int(pax or 1), 100))

    filt = {"status": "PUBLISHED"}
    ors = []
    for tok in ranking.tokenize(query) + [query]:
        rx = re.escape(tok)
        ors.extend([
            {"title": {"$regex": rx, "$options": "i"}},
            {"tags": {"$regex": rx, "$options": "i"}},
            {"category": {"$regex": rx, "$options": "i"}},
            {"cuisine": {"$regex": rx, "$options": "i"}},
            {"region": {"$regex": rx, "$options": "i"}},
        ])
    if ors:
        filt["$or"] = ors
    candidates = await db.recipes.find(filt, {"_id": 0}).to_list(200)
    if not candidates:
        return {"found": False, "query": query, "pax": pax}

    cfg = await get_ranking_config()
    cmap = await creators_map({c["creator_id"] for c in candidates if c.get("creator_id")})
    scored = ranking.score_recipes(candidates, query, cmap, cfg)
    recipe = scored[0]

    base = max(1, int(recipe.get("servings") or 1))
    factor = pax / base
    shopping_list = []
    for ingr in recipe.get("ingredients", []):
        base_qty = ingr.get("quantity", "")
        shopping_list.append({
            "name": ingr.get("name", ""),
            "unit": ingr.get("unit", ""),
            "base_quantity": base_qty,
            "quantity": scale_quantity(base_qty, factor),
        })

    return {
        "found": True,
        "query": query,
        "pax": pax,
        "base_servings": base,
        "recipe": {
            "id": recipe.get("id"), "title": recipe.get("title"), "slug": recipe.get("slug"),
            "thumbnail": recipe.get("thumbnail"), "cuisine": recipe.get("cuisine"),
            "category": recipe.get("category"), "prep_time": recipe.get("prep_time"),
            "cook_time": recipe.get("cook_time"), "difficulty": recipe.get("difficulty"),
            "creator": public_creator(cmap.get(recipe.get("creator_id"))),
        },
        "shopping_list": shopping_list,
    }


# ---------------- Recipes ----------------
@api.get("/recipes")
async def list_recipes(cuisine: str = None, category: str = None, diet: str = None,
                       limit: int = 24, skip: int = 0):
    filt = {"status": "PUBLISHED"}
    if cuisine:
        filt["cuisine"] = {"$regex": re.escape(cuisine), "$options": "i"}
    if category:
        filt["category"] = {"$regex": re.escape(category), "$options": "i"}
    if diet:
        filt["diet"] = diet
    total = await db.recipes.count_documents(filt)
    recs = await db.recipes.find(filt, {"_id": 0}).sort("rating_count", -1).skip(skip).limit(limit).to_list(limit)
    await attach_creators(recs)
    return {"total": total, "recipes": recs}


@api.get("/creator/recipes")
async def my_recipes(user=Depends(require_role("creator", "admin"))):
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if not creator:
        return {"recipes": []}
    recs = await db.recipes.find({"creator_id": creator["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"recipes": recs}


@api.get("/recipes/id/{recipe_id}")
async def get_recipe_by_id(recipe_id: str, user=Depends(require_role("creator", "admin"))):
    r = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return r


@api.get("/recipes/{slug}")
async def get_recipe(slug: str, user=Depends(get_optional_user)):
    r = await db.recipes.find_one({"slug": slug}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    await db.recipes.update_one({"id": r["id"]}, {"$inc": {"views": 1}})
    await attach_creators([r])
    if user:
        my = await db.ratings.find_one({"recipe_id": r["id"], "user_id": user["id"]}, {"_id": 0})
        r["my_rating"] = my["value"] if my else None
        saved = await db.saved_recipes.find_one({"recipe_id": r["id"], "user_id": user["id"]})
        r["is_saved"] = bool(saved)
    else:
        r["my_rating"] = None
        r["is_saved"] = False
    return r


@api.post("/recipes")
async def create_recipe(body: RecipeCreate, user=Depends(require_role("creator", "admin"))):
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=400, detail="Create a creator profile first")
    base = slugify(body.title) or "recipe"
    slug = base
    n = 2
    while await db.recipes.find_one({"slug": slug}):
        slug = f"{base}-{n}"; n += 1
    doc = body.model_dump()
    doc.pop("youtube_url", None)
    doc.update({
        "id": str(uuid.uuid4()), "slug": slug, "creator_id": creator["id"],
        "youtube_id": extract_youtube_id(body.youtube_url),
        "status": (body.status or "PUBLISHED") if user["role"] == "admin" else "PENDING",
        "views": 0, "selection_count": 0, "saves_count": 0,
        "rating_avg": 0, "rating_count": 0, "rating_sum": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    doc["ingredients"] = [i.model_dump() if hasattr(i, "model_dump") else i for i in body.ingredients]
    await db.recipes.insert_one(doc)
    await db.creators.update_one({"id": creator["id"]}, {"$inc": {"recipe_count": 1}})
    return await db.recipes.find_one({"id": doc["id"]}, {"_id": 0})


@api.put("/recipes/{recipe_id}")
async def update_recipe(recipe_id: str, body: RecipeUpdate, user=Depends(require_role("creator", "admin"))):
    r = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if user["role"] != "admin":
        creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
        if not creator or r["creator_id"] != creator["id"]:
            raise HTTPException(status_code=403, detail="Not your recipe")
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "youtube_url" in updates:
        updates["youtube_id"] = extract_youtube_id(updates.pop("youtube_url"))
    if "ingredients" in updates:
        updates["ingredients"] = [i.model_dump() if hasattr(i, "model_dump") else i for i in updates["ingredients"]]
    if user["role"] != "admin" and updates.get("status") == "PUBLISHED":
        updates["status"] = "PENDING"
    await db.recipes.update_one({"id": recipe_id}, {"$set": updates})
    return await db.recipes.find_one({"id": recipe_id}, {"_id": 0})


@api.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, user=Depends(require_role("creator", "admin"))):
    r = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if user["role"] != "admin":
        creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
        if not creator or r["creator_id"] != creator["id"]:
            raise HTTPException(status_code=403, detail="Not your recipe")
    await db.recipes.delete_one({"id": recipe_id})
    return {"ok": True}


# ---------------- Ratings ----------------
@api.post("/recipes/{recipe_id}/rate")
async def rate_recipe(recipe_id: str, body: RatingBody, user=Depends(get_current_user)):
    if body.value < 1 or body.value > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    r = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    existing = await db.ratings.find_one({"recipe_id": recipe_id, "user_id": user["id"]})
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        delta = body.value - existing["value"]
        await db.ratings.update_one({"_id": existing["_id"]}, {"$set": {"value": body.value, "updated_at": now}})
        await db.recipes.update_one({"id": recipe_id}, {"$inc": {"rating_sum": delta}})
    else:
        await db.ratings.insert_one({"id": str(uuid.uuid4()), "recipe_id": recipe_id, "user_id": user["id"],
                                     "value": body.value, "created_at": now, "updated_at": now})
        await db.recipes.update_one({"id": recipe_id}, {"$inc": {"rating_sum": body.value, "rating_count": 1}})
    r2 = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    avg = round(r2["rating_sum"] / r2["rating_count"], 2) if r2["rating_count"] else 0
    await db.recipes.update_one({"id": recipe_id}, {"$set": {"rating_avg": avg}})
    return {"rating_avg": avg, "rating_count": r2["rating_count"], "my_rating": body.value}


# ---------------- Saved ----------------
@api.post("/recipes/{recipe_id}/save")
async def toggle_save(recipe_id: str, user=Depends(get_current_user)):
    existing = await db.saved_recipes.find_one({"recipe_id": recipe_id, "user_id": user["id"]})
    if existing:
        await db.saved_recipes.delete_one({"_id": existing["_id"]})
        await db.recipes.update_one({"id": recipe_id}, {"$inc": {"saves_count": -1}})
        return {"saved": False}
    await db.saved_recipes.insert_one({"id": str(uuid.uuid4()), "recipe_id": recipe_id, "user_id": user["id"],
                                       "created_at": datetime.now(timezone.utc).isoformat()})
    await db.recipes.update_one({"id": recipe_id}, {"$inc": {"saves_count": 1}})
    return {"saved": True}


@api.get("/saved")
async def get_saved(user=Depends(get_current_user)):
    saves = await db.saved_recipes.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [s["recipe_id"] for s in saves]
    recs = await db.recipes.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    await attach_creators(recs)
    return {"recipes": recs}


@api.get("/my/ratings")
async def my_ratings(user=Depends(get_current_user)):
    ratings = await db.ratings.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [r["recipe_id"] for r in ratings]
    recs = await db.recipes.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    rmap = {r["recipe_id"]: r["value"] for r in ratings}
    await attach_creators(recs)
    for r in recs:
        r["my_rating"] = rmap.get(r["id"])
    return {"recipes": recs}


# ---------------- Preferences ----------------
@api.put("/me/preferences")
async def update_prefs(body: PreferencesBody, user=Depends(get_current_user)):
    prefs = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    await db.users.update_one({"id": user["id"]}, {"$set": {"preferences": prefs}})
    return {"preferences": prefs}


# ---------------- Creators ----------------
@api.post("/creator/apply")
async def become_creator(body: BecomeCreatorBody, user=Depends(get_current_user)):
    existing = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if existing:
        return public_creator(existing)
    base = slugify(body.display_name) or "creator"
    slug = base
    n = 2
    while await db.creators.find_one({"slug": slug}):
        slug = f"{base}-{n}"; n += 1
    cid = str(uuid.uuid4())
    doc = {"id": cid, "user_id": user["id"], "slug": slug, "display_name": body.display_name,
           "bio": body.bio, "avatar": body.avatar or user.get("picture"),
           "rating_avg": 0, "rating_count": 0, "recipe_count": 0, "top3_appearances": 0, "total_views": 0,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.creators.insert_one(doc)
    await db.users.update_one({"id": user["id"]}, {"$set": {"role": "creator", "creator_id": cid}})
    return public_creator(doc)


@api.get("/creator/dashboard")
async def creator_dashboard(user=Depends(require_role("creator", "admin"))):
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="No creator profile")
    recs = await db.recipes.find({"creator_id": creator["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    published = [r for r in recs if r["status"] == "PUBLISHED"]
    total_ratings = sum(r["rating_count"] for r in recs)
    weighted = sum(r["rating_avg"] * r["rating_count"] for r in recs)
    avg = round(weighted / total_ratings, 2) if total_ratings else 0
    total_views = sum(r["views"] for r in recs)
    return {
        "creator": public_creator(creator),
        "stats": {
            "recipes_published": len(published), "total_recipes": len(recs),
            "total_ratings": total_ratings, "average_rating": avg,
            "recipe_views": total_views, "top3_appearances": creator.get("top3_appearances", 0),
        },
        "recipes": recs,
    }


@api.get("/creators/{slug}")
async def creator_profile(slug: str):
    creator = await db.creators.find_one({"slug": slug}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    recs = await db.recipes.find({"creator_id": creator["id"], "status": "PUBLISHED"}, {"_id": 0}).to_list(500)
    return {"creator": public_creator(creator), "recipes": recs}


# Curated cuisine groups shown on the Browse-by-cuisine page.
CUISINE_GROUPS = [
    {"cuisine": "Oriental", "regions": ["Chinese", "Japanese", "Korean", "Thai", "Vietnamese"]},
    {"cuisine": "Mediterranean", "regions": ["Greek", "Turkish", "Lebanese", "Spanish"]},
    {"cuisine": "Indian", "regions": ["Oriya", "Marathi", "Bengali", "South Indian", "North Indian", "Assamese"]},
    {"cuisine": "Italian", "regions": ["Neapolitan", "Emilian", "Roman"]},
    {"cuisine": "French", "regions": ["Provencal", "Parisian"]},
    {"cuisine": "Mexican", "regions": ["Oaxacan", "Yucatecan"]},
]


@api.get("/categories")
async def categories():
    rows = await db.recipes.find(
        {"status": "PUBLISHED"}, {"_id": 0, "cuisine": 1, "region": 1}
    ).to_list(1000)
    result = []
    for grp in CUISINE_GROUPS:
        terms = [grp["cuisine"].lower()] + [r.lower() for r in grp["regions"]]
        count = 0
        for rec in rows:
            hay = f"{(rec.get('cuisine') or '').lower()} {(rec.get('region') or '').lower()}"
            if any(t in hay for t in terms):
                count += 1
        result.append({"cuisine": grp["cuisine"], "count": count, "regions": grp["regions"]})
    return {"categories": result}


@api.get("/search-terms")
async def search_terms():
    """Vocabulary of known dish words for client-side fuzzy typo correction."""
    recs = await db.recipes.find({"status": "PUBLISHED"},
                                 {"_id": 0, "title": 1, "tags": 1, "cuisine": 1, "region": 1,
                                  "category": 1, "ingredients": 1}).to_list(1000)
    vocab = set()
    for r in recs:
        for w in ranking.tokenize(r.get("title", "")):
            vocab.add(w)
        for t in r.get("tags", []):
            for w in ranking.tokenize(t):
                vocab.add(w)
        for key in ("cuisine", "region", "category"):
            for w in ranking.tokenize(r.get(key, "") or ""):
                vocab.add(w)
        for ing in r.get("ingredients", []):
            for w in ranking.tokenize(ing.get("name", "")):
                vocab.add(w)
    return {"terms": sorted(w for w in vocab if len(w) >= 3)}


# ---------------- Admin ----------------
@api.get("/admin/overview")
async def admin_overview(user=Depends(require_role("admin"))):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_searches = await db.search_events.count_documents({})
    selected = await db.search_events.count_documents({"selected_recipe_id": {"$ne": None}})
    zero = await db.search_events.count_documents({"results_count": 0})
    searches_today = await db.search_events.count_documents({"created_at": {"$regex": f"^{today}"}})
    return {
        "total_users": await db.users.count_documents({}),
        "total_creators": await db.creators.count_documents({}),
        "total_recipes": await db.recipes.count_documents({}),
        "pending_recipes": await db.recipes.count_documents({"status": "PENDING"}),
        "published_recipes": await db.recipes.count_documents({"status": "PUBLISHED"}),
        "total_ratings": await db.ratings.count_documents({}),
        "searches_today": searches_today,
        "zero_result_searches": zero,
        "total_searches": total_searches,
        "selection_rate": round(selected / total_searches * 100, 1) if total_searches else 0,
    }


@api.get("/admin/recipes")
async def admin_recipes(status: str = None, user=Depends(require_role("admin"))):
    filt = {}
    if status:
        filt["status"] = status
    recs = await db.recipes.find(filt, {"_id": 0}).sort("created_at", -1).to_list(500)
    await attach_creators(recs)
    return {"recipes": recs}


@api.post("/admin/recipes/{recipe_id}/moderate")
async def moderate_recipe(recipe_id: str, body: ModerateBody, user=Depends(require_role("admin"))):
    valid = {"DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.recipes.update_one({"id": recipe_id},
                                {"$set": {"status": body.status, "moderation_note": body.note}})
    return await db.recipes.find_one({"id": recipe_id}, {"_id": 0})


@api.get("/admin/creators")
async def admin_creators(user=Depends(require_role("admin"))):
    creators = await db.creators.find({}, {"_id": 0}).sort("rating_count", -1).to_list(500)
    return {"creators": creators}


@api.get("/admin/searches")
async def admin_searches(user=Depends(require_role("admin"))):
    zero = await db.search_events.find({"results_count": 0}, {"_id": 0}).sort("created_at", -1).to_list(100)
    suggestions = await db.suggested_dishes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    recent = await db.search_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"zero_result": zero, "suggestions": suggestions, "recent": recent}


@api.get("/admin/ranking-config")
async def get_config(user=Depends(require_role("admin"))):
    return await get_ranking_config()


@api.put("/admin/ranking-config")
async def set_config(body: WeightsBody, user=Depends(require_role("admin"))):
    await db.settings.update_one({"key": "ranking"},
                                 {"$set": {"key": "ranking", "value": {"weights": body.weights}}}, upsert=True)
    return await get_ranking_config()


@api.get("/")
async def root():
    return {"message": "Flavouria API", "status": "ok"}


app.include_router(auth_router)
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await create_indexes()
    await seed_admin()
    await seed_data.seed()
    logger.info("Flavouria backend ready.")


@app.on_event("shutdown")
async def shutdown():
    from database import client
    client.close()
