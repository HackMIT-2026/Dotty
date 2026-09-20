"""Keeps the log honest.

A child who works out that logging pays Dots can tap the same button twenty times. That would buy hats the child
didn't earn, and — much worse — it would put invented readings and meals in front of the parent and the doctor.
So the server, never the device, decides what counts: every log a child pushes is screened here before it is
stored, and anything that looks spammed is kept but marked `suspect`.

A suspect event still exists (the log is append-only and we never silently delete a child's data), but it:
  * earns no Dots, and counts for no quest, streak or care-plan task (services/gamification.py, services/tasks.py),
  * is left out of the parent's and the doctor's numbers (routers/patients.py, routers/sync.py),
  * is reported to the parent, so a real "I tapped it twice by accident" gets sorted out by a grown-up.

Only what a *child* pushes is screened. A parent logging on the child's behalf is trusted, and the simulator
already earns nothing.
"""

from collections import Counter
from datetime import timedelta

from .. import db
from ..util import day_bounds, zone

# Per event type: the smallest believable gap between two logs, how many can be logged in a local day, and how
# long two identical logs have to be apart to be two things rather than one double tap.
LIMITS: dict[str, dict[str, int]] = {
    "reading": {"gap_min": 3, "per_day": 15, "identical_min": 20},
    "meal": {"gap_min": 10, "per_day": 8, "identical_min": 60},
    "activity": {"gap_min": 10, "per_day": 6, "identical_min": 60},
    "bolus": {"gap_min": 10, "per_day": 10, "identical_min": 30},
    "basal": {"gap_min": 10, "per_day": 6, "identical_min": 60},
    "task": {"gap_min": 1, "per_day": 20, "identical_min": 1},
}
# Across all kinds: a check-up and a meal together is ordinary, and dinner can be a check-up, the meal and the
# medicine within a few minutes. Tapping through every button at once is not. (minutes, most logs in that window)
# Anything a device sends faster than this was not lived through, whatever order the buttons were pressed in.
BURSTS = ((1, 2), (5, 3))
HISTORY_HOURS = 48
MAX_ACTIVITY_MINUTES_PER_DAY = 300

FLAG_LABELS = {
    "duplicate": "the same thing twice",
    "too_fast": "logged again moments later",
    "daily_limit": "far more than a normal day",
    "burst": "everything logged at once",
    "implausible": "more than a day can hold",
}


def signature(doc: dict) -> tuple:
    """What makes two logs "the same thing". Deliberately coarse: 142 and 143 mg/dL are two real check-ups."""
    d = doc.get("data") or {}
    if doc["type"] == "reading":
        return ("reading", round(float(d.get("bg_mgdl", 0))))
    if doc["type"] == "meal":
        items = d.get("items") or []
        # by then services/food.py has turned cards and typed words into labels, so compare on those
        return ("meal", tuple(sorted(str(i.get("id") or i.get("text") or i.get("label") or "") for i in items)))
    if doc["type"] == "activity":
        return ("activity", d.get("kind"), d.get("minutes"), d.get("intensity"))
    if doc["type"] in ("bolus", "basal"):
        return (doc["type"], d.get("units"), d.get("reason"))
    return (doc["type"], d.get("task_id"))


def _history(patient_id: str, at) -> list[dict]:
    return list(
        db.events.find(
            {"patient_id": patient_id, "source": {"$ne": "simulator"}, "ts": {"$gte": at - timedelta(hours=HISTORY_HOURS)}},
            {"type": 1, "ts": 1, "data": 1, "suspect": 1},
        ).sort("ts", 1)
    )


def _flags(doc: dict, history: list[dict], tz) -> list[str]:
    limits = LIMITS.get(doc["type"])
    if not limits:
        return []
    ts, day = doc["ts"], doc["ts"].astimezone(tz).date()
    start, end = day_bounds(day, tz)
    same_type = [e for e in history if e["type"] == doc["type"] and not e.get("suspect")]
    flags: list[str] = []

    sig = signature(doc)
    if any(abs((e["ts"] - ts).total_seconds()) < limits["identical_min"] * 60 and signature(e) == sig for e in same_type):
        flags.append("duplicate")
    if any(abs((e["ts"] - ts).total_seconds()) < limits["gap_min"] * 60 for e in same_type):
        flags.append("too_fast")
    if sum(1 for e in same_type if start <= e["ts"] < end) >= limits["per_day"]:
        flags.append("daily_limit")

    # "Done!" taps on a care-plan task aren't logged care, so they neither count towards a burst nor make one.
    if doc["type"] != "task":
        for window_min, most in BURSTS:
            near = sum(
                1
                for e in history
                if e["type"] != "task" and not e.get("suspect") and abs((e["ts"] - ts).total_seconds()) < window_min * 60
            )
            if near >= most:
                flags.append("burst")
                break

    if doc["type"] == "activity":
        minutes = sum((e["data"] or {}).get("minutes", 0) for e in same_type if start <= e["ts"] < end)
        if minutes + (doc["data"] or {}).get("minutes", 0) > MAX_ACTIVITY_MINUTES_PER_DAY:
            flags.append("implausible")
    return flags


def screen(patient_id: str, docs: list[dict], tz_name: str | None, at) -> None:
    """Mark the spammed ones. Called with the documents about to be stored, in the order they were logged."""
    tz = zone(tz_name)
    history = _history(patient_id, at)
    for doc in sorted(docs, key=lambda d: d["ts"]):
        flags = _flags(doc, history, tz)
        if flags:
            doc["flags"] = flags
            doc["suspect"] = True
        history.append(doc)


def summarise(docs: list[dict]) -> str | None:
    """One line for the parent about a batch of flagged logs, or None when nothing was flagged."""
    flagged = [d for d in docs if d.get("suspect")]
    if not flagged:
        return None
    reasons = Counter(f for d in flagged for f in d.get("flags", []))
    kinds = sorted({d["type"] for d in flagged})
    why = FLAG_LABELS.get(reasons.most_common(1)[0][0], "unusual")
    what = ", ".join(kinds)
    return f"{len(flagged)} {what} {'entry' if len(flagged) == 1 else 'entries'} looked like {why}, so they weren't counted."
