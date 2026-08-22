"""AI recipe generator — creates a structured recipe for any dish on demand.

Used by the shopping-list builder when a dish isn't in the community database
(e.g. many regional Indian dishes). Powered by Claude Sonnet 4.6 via the
Emergent universal LLM key. Results are cached per dish name to save cost.
"""
import os
import re
import json
import uuid
import logging
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage

from database import db

logger = logging.getLogger("flavouria.ai_recipe")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
LLM_MODEL = os.environ.get("YOUTUBE_LLM_MODEL", "claude-sonnet-4-6")


def _prompt(name):
    return (
        f"Create an authentic home-cooking recipe for the dish: \"{name}\".\n"
        "If it is a regional Indian dish, stay true to its traditional preparation.\n\n"
        "Return ONLY valid JSON (no markdown) with this exact shape:\n"
        '{"title": "proper dish name", "cuisine": "e.g. Indian", "region": "e.g. Bengali or \'\'", '
        '"category": "e.g. Curry/Rice/Sabzi/Dessert", "servings": 4, "cook_time": 40, '
        '"difficulty": "Easy|Medium|Advanced", '
        '"ingredients": [{"name": "Ingredient", "quantity": "200", "unit": "g"}, ...], '
        '"steps": ["step 1", "step 2", ...]}\n'
        "Rules: servings and cook_time are integers. quantity is a plain number string "
        "(e.g. \"2\", \"0.5\") with the measure in unit (g, ml, tbsp, tsp, cup, cloves, or \"\" for whole counts). "
        "Ingredient 'name' must be the BARE ingredient only (e.g. \"Bitter gourd\", \"Raw banana\") with NO prep "
        "instructions like 'sliced', 'peeled and cubed' — put any prep in the steps instead. "
        "Use realistic quantities for the stated servings. Keep ingredients under 16 and steps under 12. "
        "If the dish name is not a real food, still return your best interpretation."
    )


async def generate_ai_recipe(name):
    key = (name or "").strip().lower()
    if not key:
        return None

    cached = await db.ai_recipes.find_one({"key": key}, {"_id": 0})
    if cached:
        return cached

    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"ai-recipe-{abs(hash(key)) % 100000}",
                       system_message="You are a precise recipe writer that returns strict JSON only.")
        chat.with_model("anthropic", LLM_MODEL)
        resp = await chat.send_message(UserMessage(text=_prompt(name)))
        text = resp if isinstance(resp, str) else str(resp)
        m = re.search(r"\{.*\}", text, re.DOTALL)
        data = json.loads(m.group(0)) if m else {}
    except Exception as e:
        logger.warning(f"AI recipe generation failed for '{name}': {e}")
        return None

    if not data.get("ingredients") or not data.get("title"):
        return None

    ingredients = []
    for i in data.get("ingredients", [])[:16]:
        if not isinstance(i, dict) or not i.get("name"):
            continue
        ingredients.append({
            "name": str(i.get("name", "")).strip(),
            "quantity": str(i.get("quantity", "")).strip(),
            "unit": str(i.get("unit", "")).strip(),
        })

    def _int(v, default):
        try:
            return int(float(v))
        except (TypeError, ValueError):
            return default

    doc = {
        "key": key,
        "id": f"ai-{uuid.uuid4()}",
        "source": "ai",
        "title": str(data.get("title", name)).strip(),
        "slug": None,
        "thumbnail": None,
        "cuisine": str(data.get("cuisine", "") or "").strip(),
        "region": str(data.get("region", "") or "").strip(),
        "category": str(data.get("category", "") or "").strip(),
        "difficulty": str(data.get("difficulty", "Medium") or "Medium").strip(),
        "servings": max(1, _int(data.get("servings"), 4)),
        "cook_time": max(0, _int(data.get("cook_time"), 30)),
        "ingredients": ingredients,
        "instructions": [str(s).strip() for s in data.get("steps", []) if str(s).strip()][:12],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ai_recipes.update_one({"key": key}, {"$set": doc}, upsert=True)
    return doc
