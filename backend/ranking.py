"""Flavouria ranking engine.

Kept as a standalone module so the scoring model can evolve without touching
API or UI code. Weights are configurable (persisted in the `settings` collection).

Flavouria Score = Rating Quality + Rating Confidence + Search Relevance
                  + Recipe Completeness + Creator Reliability
"""
import re
from typing import List, Dict

DEFAULT_CONFIG = {
    "weights": {
        "rating_quality": 0.40,
        "rating_confidence": 0.25,
        "search_relevance": 0.20,
        "recipe_completeness": 0.10,
        "creator_reliability": 0.05,
    },
    # Bayesian prior for rating quality
    "prior_mean": 4.2,
    "prior_count": 40,
    # Confidence saturation constant
    "confidence_k": 200,
    # A recipe must clear this Flavouria score (0-1) to earn a Top-3 slot
    "quality_threshold": 0.35,
    # Penalty applied to candidates that duplicate an already-selected recipe's
    # (cuisine, spice_level) signature during diverse selection.
    "diversity_penalty": 0.18,
}

_STOPWORDS = {"the", "a", "an", "with", "and", "of", "for", "in", "to", "recipe", "best", "easy"}


def tokenize(text: str) -> List[str]:
    return [t for t in re.findall(r"[a-z0-9]+", (text or "").lower()) if t not in _STOPWORDS]


def rating_quality(recipe: dict, cfg: dict) -> float:
    m = cfg["prior_mean"]
    c = cfg["prior_count"]
    count = recipe.get("rating_count", 0) or 0
    rsum = recipe.get("rating_sum", 0) or 0
    bayes = (c * m + rsum) / (c + count) if (c + count) else m
    return max(0.0, min(1.0, bayes / 5.0))


def rating_confidence(recipe: dict, cfg: dict) -> float:
    count = recipe.get("rating_count", 0) or 0
    k = cfg["confidence_k"]
    return count / (count + k) if (count + k) else 0.0


def search_relevance(recipe: dict, query_tokens: List[str]) -> float:
    if not query_tokens:
        return 0.6  # neutral relevance when browsing without a query
    title = set(tokenize(recipe.get("title", "")))
    tags = set(tokenize(" ".join(recipe.get("tags", []))))
    cuisine = set(tokenize(f"{recipe.get('cuisine','')} {recipe.get('region','')} {recipe.get('category','')}"))
    ingredients = set(tokenize(" ".join(i.get("name", "") for i in recipe.get("ingredients", []))))
    desc = set(tokenize(recipe.get("description", "")))

    score = 0.0
    for tok in query_tokens:
        if tok in title:
            score += 1.0
        elif tok in tags or tok in cuisine:
            score += 0.6
        elif tok in ingredients:
            score += 0.45
        elif tok in desc:
            score += 0.25
    return max(0.0, min(1.0, score / len(query_tokens)))


def recipe_completeness(recipe: dict) -> float:
    checks = [
        bool(recipe.get("thumbnail")),
        bool(recipe.get("youtube_id")),
        len(recipe.get("ingredients", [])) >= 5,
        len(recipe.get("instructions", [])) >= 4,
        len(recipe.get("description", "") or "") >= 60,
    ]
    return sum(1 for c in checks if c) / len(checks)


def creator_reliability(recipe: dict, creators: Dict[str, dict]) -> float:
    creator = creators.get(recipe.get("creator_id"))
    if not creator:
        return 0.4
    avg = (creator.get("rating_avg", 0) or 0) / 5.0
    volume = min((creator.get("recipe_count", 0) or 0) / 10.0, 1.0)
    return max(0.0, min(1.0, 0.6 * avg + 0.4 * volume))


def score_recipe(recipe: dict, query_tokens: List[str], creators: Dict[str, dict], cfg: dict) -> dict:
    parts = {
        "rating_quality": rating_quality(recipe, cfg),
        "rating_confidence": rating_confidence(recipe, cfg),
        "search_relevance": search_relevance(recipe, query_tokens),
        "recipe_completeness": recipe_completeness(recipe),
        "creator_reliability": creator_reliability(recipe, creators),
    }
    w = cfg["weights"]
    total = sum(parts[k] * w.get(k, 0) for k in parts)
    return {"score": total, "breakdown": parts}


def score_recipes(recipes: List[dict], query: str, creators: Dict[str, dict], cfg: dict) -> List[dict]:
    tokens = tokenize(query)
    out = []
    for r in recipes:
        s = score_recipe(r, tokens, creators, cfg)
        out.append({**r, "flavouria_score": round(s["score"], 4), "score_breakdown": s["breakdown"]})
    out.sort(key=lambda x: x["flavouria_score"], reverse=True)
    return out


def select_top_diverse(scored: List[dict], n: int, cfg: dict) -> List[dict]:
    """Greedy diverse selection: pick highest, then re-rank remaining with a penalty
    for sharing (cuisine, spice_level) with an already-picked recipe."""
    threshold = cfg["quality_threshold"]
    pool = [r for r in scored if r["flavouria_score"] >= threshold]
    if not pool:
        pool = scored[:]
    selected: List[dict] = []
    used_sigs: List[tuple] = []
    penalty = cfg["diversity_penalty"]

    while pool and len(selected) < n:
        best = None
        best_adj = -1.0
        for r in pool:
            sig = (r.get("cuisine"), r.get("spice_level"))
            region_sig = r.get("region")
            adj = r["flavouria_score"]
            for us, ur in used_sigs:
                if us == sig:
                    adj -= penalty
                elif ur and ur == region_sig:
                    adj -= penalty * 0.5
            if adj > best_adj:
                best_adj = adj
                best = r
        selected.append(best)
        used_sigs.append(((best.get("cuisine"), best.get("spice_level")), best.get("region")))
        pool.remove(best)
    return selected


def why_its_here(recipe: dict, rank: int, group: List[dict]) -> str:
    spice = (recipe.get("spice_level") or "").capitalize()
    if rank == 0:
        return f"Highest-rated {spice.lower()} option" if spice else "Highest-rated option"
    # distinguishing attribute vs the group
    times = [g.get("cook_time", 999) for g in group]
    if recipe.get("cook_time") == min(times):
        return "Quickest to cook"
    counts = [g.get("rating_count", 0) for g in group]
    if recipe.get("rating_count") == max(counts):
        return "Most reviewed by the community"
    if recipe.get("spice_level") == "mild":
        return "Best mild option"
    if recipe.get("spice_level") == "medium":
        return "Highly-rated traditional option"
    return "A strong, well-rated alternative"
