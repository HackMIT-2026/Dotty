"""Turns logged behaviors into Dots, streaks, quests, badges and Dotty's mood.

Principle: reward habits (checking, logging, moving), never glucose values. The simulator never earns rewards.
The doctor's care plan (services/tasks.py) weighs most: each task pays its own `reward_dots`, the whole plan pays a
bonus, and Dotty's mood and "Love" follow it. Good habits (meals, play) keep their smaller rewards.
"""

from collections import Counter
from datetime import date, timedelta

from .. import db
from ..util import at_local, day_bounds, now, zone
from . import alerts
from . import tasks as care

DOTS_READING = 10
DOTS_MEAL = 10
DOTS_ACTIVITY = 10
DOTS_MEDICINE = 10
DOTS_ACTIVITY_PER_15MIN = 5
DOTS_ACTIVITY_EXTRA_CAP = 30
DOTS_PLAN_BONUS = 50
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
    "waiting": "Let's catch the next quest together!",
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
        "task_awards": [],
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


def habit_quests(day_events: list[dict], tz, has_check_tasks: bool) -> list[dict]:
    """Good-habit quests that stay alongside the doctor's plan."""
    checks = sum(1 for e in day_events if e["type"] == "reading")
    lunches = sum(1 for e in day_events if e["type"] == "meal" and 11 <= e["ts"].astimezone(tz).hour < 16)
    minutes = sum(e["data"].get("minutes", 0) for e in day_events if e["type"] == "activity")
    quests = []
    if not has_check_tasks:  # the doctor's check-up tasks replace the generic one
        quests.append({"id": "checks", "title": "Check on Dotty 4 times", "target": 4, "progress": min(checks, 4)})
    quests += [
        {"id": "lunch", "title": "Log lunch", "target": 1, "progress": min(lunches, 1)},
        {"id": "play", "title": "Play outside for 20 min", "target": 20, "progress": min(minutes, 20)},
    ]
    for q in quests:
        q["done"] = q["progress"] >= q["target"]
    return quests


CHILD_STATUS = {"done": "done", "pending": "upcoming"}  # lapsed quests are dropped, never shown as "missed"


def daily_quests(patient_id: str, tz, today: date, at=None) -> dict:
    """{plan: doctor's tasks as kid quests, habits: good-habit quests}. Child-safe: no doctor wording or doses."""
    at = at or now()
    summary = care.day_summary(patient_id, today, tz, at)
    start, end = day_bounds(today, tz)
    evs = care.events_between(patient_id, start, end)
    # still to do first, finished at the bottom; a lapsed quest disappears (the parent is told instead)
    visible = [s for s in summary if s["status"] == "pending"] + [s for s in summary if s["status"] == "done"]
    plan = [
        {
            **care.child_view(s["task"]),
            "when": care.friendly_time(s["task"].get("time")),
            "status": CHILD_STATUS[s["status"]],
            "done": s["status"] == "done",
        }
        for s in visible
    ]
    has_checks = any(s["task"]["kind"] == "check" for s in summary)
    return {"plan": plan, "habits": habit_quests(evs, tz, has_checks)}


def process_events(patient_id: str, new_events: list[dict], tz_name: str | None, at=None) -> tuple[dict, list[dict]]:
    """Apply rewards for freshly inserted events. Returns the updated pet and the rewards earned."""
    at = at or now()
    tz = zone(tz_name)
    pet = get_pet(patient_id)
    pet.setdefault("task_awards", [])
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
            if e["ts"].astimezone(tz).hour >= 20:
                bedtime_check = True
        elif e["type"] == "meal":
            _award(pet, rewards, DOTS_MEAL, "Dotty ate with you!")
        elif e["type"] == "activity":
            extra = min(DOTS_ACTIVITY_EXTRA_CAP, DOTS_ACTIVITY_PER_15MIN * (int(d.get("minutes", 0)) // 15))
            _award(pet, rewards, DOTS_ACTIVITY + extra, "Dotty played with you!")
        elif e["type"] in ("bolus", "basal"):
            _award(pet, rewards, DOTS_MEDICINE, "Medicine time done!")

    today = at.astimezone(tz).date()
    days = {today} | {e["ts"].astimezone(tz).date() for e in real}
    for day in sorted(days):
        _task_rewards(pet, patient_id, tz, day, at, rewards)
    _update_streak(pet, patient_id, tz, today, rewards)
    _evaluate_badges(pet, patient_id, rewards, bedtime_check)

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


def _task_rewards(pet, patient_id, tz, day, at, rewards) -> None:
    """Pay each doctor task once per day when it becomes done, plus a bonus once the whole day's plan is done."""
    summary = care.day_summary(patient_id, day, tz, at)
    if not summary:
        return
    iso = day.isoformat()
    for s in summary:
        key = f"{s['task']['_id']}@{iso}"
        if s["status"] == "done" and key not in pet["task_awards"]:
            pet["task_awards"].append(key)
            title = s["task"].get("quest_title") or care.quest_title_for(s["task"]["kind"], s["task"].get("time"))
            _award(pet, rewards, s["task"].get("reward_dots", 25), title, "task")
    plan_key = f"plan@{iso}"
    if all(s["status"] == "done" for s in summary) and plan_key not in pet["task_awards"]:
        pet["task_awards"].append(plan_key)
        _reward_notification(
            patient_id, _award(pet, rewards, DOTS_PLAN_BONUS, "All big quests done!", "quests"), "Dotty is so proud of you!"
        )
    pet["task_awards"] = pet["task_awards"][-500:]


def compute_mood(last_reading: dict | None, at, missed_task: bool = False) -> str:
    """Glucose first (Dotty feels it too), then the doctor's plan, then how long since the last check-up."""
    recent = last_reading is not None and (at - last_reading["ts"]).total_seconds() < SLEEPY_AFTER_HOURS * 3600
    if recent:
        bg = last_reading["data"]["bg_mgdl"]
        if bg < 70:
            return "shaky"
        if bg > 180:
            return "sluggish"
    if missed_task:
        return "waiting"
    return "bouncy" if recent else "sleepy"


def pet_view(pet: dict, tz_name: str | None, at=None) -> dict:
    """Pet as sent to clients. Never includes glucose values or insulin doses."""
    at = at or now()
    tz = zone(tz_name)
    today = at.astimezone(tz).date()
    last = db.events.find_one({"patient_id": pet["_id"], "type": "reading"}, sort=[("ts", -1)])
    summary = care.day_summary(pet["_id"], today, tz, at)
    mood = compute_mood(last, at, any(s["status"] == "missed" for s in summary))
    view = {k: v for k, v in pet.items() if k not in ("_id", "streak_awards", "task_awards", "quest_bonus_date")}
    view.update(
        id=pet["_id"],
        level=1 + pet["xp"] // DOTS_PER_LEVEL,
        level_progress=pet["xp"] % DOTS_PER_LEVEL,
        dots_per_level=DOTS_PER_LEVEL,
        mood=mood,
        mood_message=MOOD_MESSAGES[mood],
        quests=daily_quests(pet["_id"], tz, today, at),
        adherence_today=care.weighted_adherence(summary),
    )
    return view
