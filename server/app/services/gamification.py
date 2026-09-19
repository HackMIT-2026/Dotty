"""Turns logged behaviors into Dots, streaks, quests, badges and Dotty's mood.

Principle: reward habits (checking, logging, moving), never glucose values. The simulator never earns rewards.
"""

from collections import Counter
from datetime import date, timedelta

from .. import db
from ..util import at_local, day_bounds, now, zone
from . import alerts

DOTS_READING = 10
DOTS_ON_TIME_BONUS = 15
DOTS_MEAL = 10
DOTS_ACTIVITY = 10
DOTS_MEDICINE = 10
DOTS_ACTIVITY_PER_15MIN = 5
DOTS_ACTIVITY_EXTRA_CAP = 30
DOTS_QUEST_BONUS = 50
DOTS_HIGH_FIVE = 5
MAX_REWARDED_READINGS_PER_DAY = 8
STREAK_MIN_READINGS = 3
STREAK_MILESTONES = {3: 30, 7: 100, 30: 500}
SLEEPY_AFTER_HOURS = 4
DOTS_PER_LEVEL = 100

BADGES = {
    "first_week": "First Week",
    "night_owl": "Night Owl",
    "carb_counter": "Carb Counter",
    "sport_star": "Sport Star",
}

MOOD_MESSAGES = {
    "sleepy": "Zzz... can you check on me?",
    "bouncy": "I feel great! Let's play!",
    "sluggish": "I'm a little slow today. A walk might help!",
    "shaky": "I feel wobbly. Maybe a snack?",
}


def new_pet(patient_id: str, name: str = "Dotty") -> dict:
    return {
        "_id": patient_id,
        "patient_id": patient_id,
        "name": name,
        "dots": 0,
        "xp": 0,
        "streak_days": 0,
        "last_checkup_at": None,
        "equipped": {"color": "color_sky", "hat": None, "accessory": None, "background": "bg_day"},
        "owned_items": ["color_sky", "bg_day"],
        "badges": [],
        "streak_awards": [],
        "quest_bonus_date": None,
    }


def get_pet(patient_id: str) -> dict:
    pet = db.pets.find_one({"_id": patient_id})
    if not pet:
        pet = new_pet(patient_id)
        db.pets.insert_one(pet)
    return pet


def _award(pet: dict, rewards: list, dots: int, label: str, kind: str = "dots") -> dict:
    pet["dots"] += dots
    pet["xp"] += dots
    reward = {"kind": kind, "dots": dots, "label": label}
    rewards.append(reward)
    return reward


def _reward_notification(patient_id: str, reward: dict, body: str) -> None:
    reward["id"] = alerts.notify(patient_id, "reward", reward["label"], body, {"kind": reward["kind"], "dots": reward["dots"]})


def in_reminder_window(plan: dict | None, ts, tz, kinds: tuple[str, ...] | None = None) -> bool:
    if not plan:
        return False
    local = ts.astimezone(tz)
    for r in plan.get("reminders", []):
        if kinds and r["kind"] not in kinds:
            continue
        centre = at_local(local.date(), r["time"], tz)
        if abs(local - centre) <= timedelta(minutes=r.get("window_min", 60)):
            return True
    return False


def compute_streak(patient_id: str, tz, today: date) -> tuple[int, date | None]:
    """Consecutive local days with >= 3 readings, ending today (or yesterday, since today is still in progress)."""
    since = day_bounds(today - timedelta(days=60), tz)[0]
    cursor = db.events.find(
        {"patient_id": patient_id, "type": "reading", "source": {"$ne": "simulator"}, "ts": {"$gte": since}}, {"ts": 1}
    )
    counts = Counter(e["ts"].astimezone(tz).date() for e in cursor)
    good = {d for d, c in counts.items() if c >= STREAK_MIN_READINGS}
    day = today if today in good else today - timedelta(days=1)
    streak = 0
    while day in good:
        streak += 1
        day -= timedelta(days=1)
    return streak, (day + timedelta(days=1) if streak else None)


def daily_quests(patient_id: str, tz, today: date) -> list[dict]:
    start, end = day_bounds(today, tz)
    todays = list(
        db.events.find({"patient_id": patient_id, "source": {"$ne": "simulator"}, "ts": {"$gte": start, "$lt": end}})
    )
    checks = sum(1 for e in todays if e["type"] == "reading")
    lunches = sum(1 for e in todays if e["type"] == "meal" and 11 <= e["ts"].astimezone(tz).hour < 16)
    minutes = sum(e["data"].get("minutes", 0) for e in todays if e["type"] == "activity")
    quests = [
        {"id": "checks", "title": "Check on Dotty 4 times", "target": 4, "progress": min(checks, 4)},
        {"id": "lunch", "title": "Log lunch", "target": 1, "progress": min(lunches, 1)},
        {"id": "play", "title": "Play outside for 20 min", "target": 20, "progress": min(minutes, 20)},
    ]
    for q in quests:
        q["done"] = q["progress"] >= q["target"]
    return quests


def process_events(patient_id: str, new_events: list[dict], tz_name: str | None, at=None) -> tuple[dict, list[dict]]:
    """Apply rewards for freshly inserted events. Returns the updated pet and the rewards earned."""
    at = at or now()
    tz = zone(tz_name)
    pet = get_pet(patient_id)
    plan = db.plans.find_one({"patient_id": patient_id})
    rewards: list[dict] = []
    level_before = 1 + pet["xp"] // DOTS_PER_LEVEL
    rewarded_readings: dict[date, int] = {}
    bedtime_check = False

    real = sorted((e for e in new_events if e["source"] != "simulator"), key=lambda e: e["ts"])
    new_reading_days = Counter(e["ts"].astimezone(tz).date() for e in real if e["type"] == "reading")

    for e in real:
        d = e["data"]
        if e["type"] == "reading":
            day = e["ts"].astimezone(tz).date()
            if day not in rewarded_readings:
                start, end = day_bounds(day, tz)
                total = db.events.count_documents(
                    {"patient_id": patient_id, "type": "reading", "source": {"$ne": "simulator"}, "ts": {"$gte": start, "$lt": end}}
                )
                rewarded_readings[day] = total - new_reading_days[day]  # readings already there before this batch
            rewarded_readings[day] += 1
            if pet["last_checkup_at"] is None or e["ts"] > pet["last_checkup_at"]:
                pet["last_checkup_at"] = e["ts"]
            if rewarded_readings[day] <= MAX_REWARDED_READINGS_PER_DAY:
                _award(pet, rewards, DOTS_READING, "Check-up done!")
                if in_reminder_window(plan, e["ts"], tz):
                    _award(pet, rewards, DOTS_ON_TIME_BONUS, "Right on time!")
            if in_reminder_window(plan, e["ts"], tz, ("bedtime",)):
                bedtime_check = True
        elif e["type"] == "meal":
            _award(pet, rewards, DOTS_MEAL, "Dotty ate with you!")
        elif e["type"] == "activity":
            extra = min(DOTS_ACTIVITY_EXTRA_CAP, DOTS_ACTIVITY_PER_15MIN * (int(d.get("minutes", 0)) // 15))
            _award(pet, rewards, DOTS_ACTIVITY + extra, "Dotty played with you!")
        elif e["type"] in ("bolus", "basal"):
            _award(pet, rewards, DOTS_MEDICINE, "Medicine time done!")

    today = at.astimezone(tz).date()
    _update_streak(pet, patient_id, tz, today, rewards)
    _evaluate_badges(pet, patient_id, rewards, bedtime_check)
    _quest_bonus(pet, patient_id, tz, today, rewards)

    level_after = 1 + pet["xp"] // DOTS_PER_LEVEL
    if level_after > level_before:
        _reward_notification(patient_id, _award(pet, rewards, 0, f"Level {level_after}!", "level_up"), "Dotty grew stronger!")

    db.pets.replace_one({"_id": pet["_id"]}, pet)
    return pet, rewards


def _update_streak(pet, patient_id, tz, today, rewards) -> None:
    streak, start = compute_streak(patient_id, tz, today)
    pet["streak_days"] = streak
    for milestone, dots in STREAK_MILESTONES.items():
        key = f"{milestone}@{start.isoformat() if start else ''}"
        if streak >= milestone and key not in pet["streak_awards"]:
            pet["streak_awards"].append(key)
            _reward_notification(
                patient_id, _award(pet, rewards, dots, f"{milestone}-day streak!", "streak"), f"{milestone} days of check-ups in a row!"
            )


def _evaluate_badges(pet, patient_id, rewards, bedtime_check: bool) -> None:
    def count(t: str) -> int:
        return db.events.count_documents({"patient_id": patient_id, "type": t, "source": {"$ne": "simulator"}})

    earned = {
        "first_week": pet["streak_days"] >= 7,
        "night_owl": bedtime_check,
        "carb_counter": count("meal") >= 10,
        "sport_star": count("activity") >= 5,
    }
    for badge, ok in earned.items():
        if ok and badge not in pet["badges"]:
            pet["badges"].append(badge)
            _reward_notification(
                patient_id, _award(pet, rewards, 0, f"Badge: {BADGES[badge]}", "badge"), "A new skin may be unlocked in the shop!"
            )


def _quest_bonus(pet, patient_id, tz, today, rewards) -> None:
    quests = daily_quests(patient_id, tz, today)
    if all(q["done"] for q in quests) and pet.get("quest_bonus_date") != today.isoformat():
        pet["quest_bonus_date"] = today.isoformat()
        _award(pet, rewards, DOTS_QUEST_BONUS, "All quests complete!", "quests")


def compute_mood(last_reading: dict | None, at) -> str:
    if last_reading is None or (at - last_reading["ts"]).total_seconds() >= SLEEPY_AFTER_HOURS * 3600:
        return "sleepy"
    bg = last_reading["data"]["bg_mgdl"]
    if bg < 70:
        return "shaky"
    if bg > 180:
        return "sluggish"
    return "bouncy"


def pet_view(pet: dict, tz_name: str | None, at=None) -> dict:
    """Pet as sent to clients. Never includes glucose values or insulin doses."""
    at = at or now()
    tz = zone(tz_name)
    last = db.events.find_one({"patient_id": pet["_id"], "type": "reading"}, sort=[("ts", -1)])
    mood = compute_mood(last, at)
    view = {k: v for k, v in pet.items() if k not in ("_id", "streak_awards")}
    view.update(
        id=pet["_id"],
        level=1 + pet["xp"] // DOTS_PER_LEVEL,
        level_progress=pet["xp"] % DOTS_PER_LEVEL,
        dots_per_level=DOTS_PER_LEVEL,
        mood=mood,
        mood_message=MOOD_MESSAGES[mood],
        quests=daily_quests(pet["_id"], tz, at.astimezone(tz).date()),
    )
    return view
