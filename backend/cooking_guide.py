"""AI-guided combined cooking plan for a multi-recipe shopping list.

Given several recipes (each with a serving target, scaled ingredients and steps),
Claude produces ONE efficient, ordered step-by-step plan that cooks everything —
interleaving prep, parallelising where possible, and calling out timing.
"""
import os
import re
import json
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger("flavouria.cooking_guide")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
LLM_MODEL = os.environ.get("YOUTUBE_LLM_MODEL", "claude-sonnet-4-6")


def _build_prompt(list_name, recipes):
    blocks = []
    for r in recipes:
        ing = "\n".join(
            f"    - {' '.join(x for x in [i.get('quantity',''), i.get('unit',''), i.get('name','')] if x)}"
            for i in r.get("ingredients", [])
        )
        steps = "\n".join(f"    {n}. {s}" for n, s in enumerate(r.get("steps", []), 1))
        blocks.append(
            f"RECIPE: {r.get('title')} (serving {r.get('pax')} people)\n"
            f"  Ingredients:\n{ing or '    (none listed)'}\n"
            f"  Original steps:\n{steps or '    (none listed)'}"
        )
    recipes_text = "\n\n".join(blocks)
    return (
        "You are a head chef guiding a home cook to prepare MULTIPLE dishes together as "
        "efficiently as possible. Combine the recipes below into ONE ordered, step-by-step "
        "plan. Interleave and parallelise where it saves time (e.g. start rice, then chop for "
        "the curry while it cooks). Each step must be a single clear action, mention which dish "
        "it belongs to when helpful, and include timing/heat cues.\n\n"
        f"SHOPPING LIST NAME: {list_name}\n\n"
        f"{recipes_text}\n\n"
        "Return ONLY valid JSON (no markdown) with this exact shape:\n"
        '{"overview": "1-2 sentence game plan", "total_time": "e.g. about 75 minutes", '
        '"steps": ["step 1", "step 2", ...]}\n'
        "Keep steps between 6 and 20, ordered so all dishes finish around the same time."
    )


async def generate_cooking_guide(list_name, recipes):
    prompt = _build_prompt(list_name or "My meal", recipes)
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"cook-guide-{abs(hash(list_name)) % 100000}",
            system_message="You plan multi-dish cooking sessions and return strict JSON only.",
        )
        chat.with_model("anthropic", LLM_MODEL)
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else str(resp)
        m = re.search(r"\{.*\}", text, re.DOTALL)
        data = json.loads(m.group(0)) if m else {}
    except Exception as e:
        logger.warning(f"cooking guide LLM failed: {e}")
        data = {}

    steps = data.get("steps") or []
    if not steps:
        # Fallback: concatenate each recipe's own steps, labelled by dish.
        steps = []
        for r in recipes:
            for s in r.get("steps", []):
                steps.append(f"{r.get('title')}: {s}")
    return {
        "overview": data.get("overview") or f"A combined plan to cook {len(recipes)} dishes together.",
        "total_time": data.get("total_time") or "",
        "steps": steps,
    }
