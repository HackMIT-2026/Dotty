"""Turning "mac and cheese" into grams of carbs — on the server, where the grown-ups' numbers live.

The child types what they are eating. Claude estimates the carbs, the estimate is cached so the same lunch is
free the second time, and the result goes into the meal event. The child never sees the number: the estimate is
for the parent's dose helper and the doctor's logbook (routers/sync.py hides it from the child's app).

When Claude isn't configured or isn't sure, we fall back to the food table and, failing that, ask a grown-up —
a guess nobody checked is the one thing that must never reach a dose.
"""

import json
import logging
import os
import re

from .. import db
from ..data.foods import BY_ID, EXTRAS, FOODS
from ..util import now

log = logging.getLogger("dotty.food")

# Haiku is the cheapest Claude model and plenty for naming a plate of food and sizing a child's portion; when
# it isn't sure, the confidence gate below sends the meal to a parent rather than guessing. Override with
# DOTTY_FOOD_MODEL (e.g. claude-opus-5) if an estimate needs more judgement than this.
MODEL = os.getenv("DOTTY_FOOD_MODEL", "claude-haiku-4-5")
# `output_config.effort` only exists on the current Opus/Sonnet generation — Haiku 4.5 and the 4.5 Sonnets
# reject it with a 400, which would send every estimate to the fallback table. Leaving it out is always valid.
SUPPORTS_EFFORT = not any(tag in MODEL for tag in ("haiku", "-4-5"))
MAX_CARBS = 300
MIN_CONFIDENCE = 0.55  # below this a grown-up confirms the number before it can drive a dose
MAX_LLM_CALLS_PER_PUSH = 3

SYSTEM = """You estimate carbohydrates for a child with type 1 diabetes, from what the child typed on their phone.

Reply about ONE typical portion for a child aged 6-12 unless the text gives a portion or a number of items.
- carbs_g: total grams of carbohydrate in that portion, 0 if the food has none (meat, cheese, eggs, water).
- label: what you understood, 1-4 plain words, capitalised, as a child would read it back ("Mac and cheese").
- confidence: 0-1. Be honest. Use below 0.55 when the text is unclear, made up, not food, a home-made dish
  whose recipe changes the answer a lot, or a restaurant portion you cannot size.
- note: at most 12 words for the parent, saying what you assumed ("assumed one cup"). Empty if nothing to add.

Estimate the food, never the insulin. A parent checks every number before it is used."""


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", (text or "").lower())).strip()


# Words that carry no food in them, so "mac and cheese" still finds "mac cheese".
FILLER = {"and", "with", "of", "a", "an", "the", "some", "my", "n", "plus", "ate", "eating", "i"}


def _words(text: str) -> list[str]:
    return [w for w in normalize(text).split() if w not in FILLER]


def _table_match(text: str) -> dict | None:
    """The offline answer: the food cards and a few kitchen words. The most specific match wins, so
    "apple juice" is juice, not an apple."""
    words = set(_words(text))
    if not words:
        return None
    candidates: list[tuple[int, dict]] = []
    for food in FOODS:
        for syn in food["synonyms"]:
            tokens = _words(syn)
            if tokens and set(tokens) <= words:
                candidates.append((len(tokens), {"carbs_g": food["carbs"], "label": food["name"], "confidence": 0.8}))
    for word, (label, carbs) in EXTRAS.items():
        if word in words:
            candidates.append((1, {"carbs_g": carbs, "label": label, "confidence": 0.7}))
    if not candidates:
        return None
    best = max(candidates, key=lambda c: c[0])[1]
    return {**best, "source": "table", "note": ""}


def _client():
    """The Anthropic client, or None when no key is configured (the demo still runs on the table)."""
    if not os.getenv("ANTHROPIC_API_KEY"):
        return None
    try:
        import anthropic
    except ImportError:
        log.warning("anthropic package not installed; carb estimates fall back to the food table")
        return None
    return anthropic.Anthropic()


SCHEMA = {
    "type": "object",
    "properties": {
        "carbs_g": {"type": "number"},
        "label": {"type": "string"},
        "confidence": {"type": "number"},
        "note": {"type": "string"},
    },
    "required": ["carbs_g", "label", "confidence", "note"],
    "additionalProperties": False,
}


def _ask_claude(text: str) -> dict | None:
    client = _client()
    if client is None:
        return None
    try:
        response = client.with_options(timeout=20.0, max_retries=1).messages.create(
            model=MODEL,
            max_tokens=1000,
            system=SYSTEM,
            messages=[{"role": "user", "content": text[:200]}],
            output_config={
                **({"effort": "low"} if SUPPORTS_EFFORT else {}),
                "format": {"type": "json_schema", "schema": SCHEMA},
            },
        )
        data = json.loads(next(b.text for b in response.content if b.type == "text"))
    except Exception:  # a carb estimate is never worth a failed log
        log.exception("carb estimate failed")
        return None
    carbs = float(data.get("carbs_g", 0))
    if not 0 <= carbs <= MAX_CARBS:
        return None
    return {
        "carbs_g": round(carbs),
        "label": (data.get("label") or text)[:40],
        "confidence": max(0.0, min(1.0, float(data.get("confidence", 0)))),
        "note": (data.get("note") or "")[:80],
        "source": "llm",
    }


def estimate(text: str, use_llm: bool = True) -> dict:
    """{carbs_g, label, confidence, source, note, needs_parent} for a typed food. Cached by what was typed."""
    norm = normalize(text)
    if not norm:
        return {"carbs_g": 0, "label": text.strip()[:40] or "Food", "confidence": 0.0, "source": "unknown", "note": "", "needs_parent": True}

    cached = db.food_cache.find_one({"_id": norm})
    if cached:
        return {k: v for k, v in cached.items() if k != "_id"}

    result = (_ask_claude(text) if use_llm else None) or _table_match(text)
    if result is None:
        result = {"carbs_g": 0, "label": text.strip()[:40], "confidence": 0.0, "source": "unknown", "note": ""}
    result["needs_parent"] = result["confidence"] < MIN_CONFIDENCE
    if result["source"] != "unknown":
        db.food_cache.update_one({"_id": norm}, {"$setOnInsert": {**result, "created_at": now()}}, upsert=True)
    return result


def resolve_items(items: list[dict]) -> dict:
    """Grams for a meal the child logged as food cards and typed words. The device never sends carbs."""
    resolved, total, sources, needs_parent, llm_calls = [], 0.0, set(), False, 0
    for item in items[:20]:
        count = max(1, min(20, int(item.get("n") or 1)))
        card = BY_ID.get(item.get("id") or "")
        if card:
            carbs, label, source, note = card["carbs"], card["name"], "cards", ""
        else:
            text = str(item.get("text") or "").strip()
            if not text:
                continue
            est = estimate(text, use_llm=llm_calls < MAX_LLM_CALLS_PER_PUSH)
            llm_calls += est["source"] == "llm"
            carbs, label, source, note = est["carbs_g"], est["label"], est["source"], est["note"]
            needs_parent = needs_parent or est["needs_parent"]
        total += carbs * count
        sources.add(source)
        resolved.append({"label": label, "n": count, "carbs": carbs, "source": source, **({"note": note} if note else {})})
    total = min(total, MAX_CARBS)
    return {
        "carbs_g": round(total),
        "items": resolved,
        "carbs_source": "cards" if sources <= {"cards"} else ("unknown" if "unknown" in sources else "estimated"),
        "needs_parent": needs_parent or not resolved,
    }


def kid_view(est: dict) -> dict:
    """What the child's app is allowed to hear back: the name of the food, never the grams."""
    return {"label": est["label"], "needs_parent": est["needs_parent"], "known": est["source"] != "unknown"}
