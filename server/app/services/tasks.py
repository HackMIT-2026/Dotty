"""The doctor's daily care plan: which tasks are due on a day, and whether the logged events complete them.

Completion is derived from ordinary events, so it works with the offline outbox and is idempotent:
  check -> a reading in the window      medicine -> bolus/basal in the window     meal -> meal in the window
  activity -> activity minutes that day >= target      custom -> a `task` event {task_id, date} ("Done" tap)
light-client/src/lib/derive.ts (taskStatus) mirrors these rules so the apps work offline; keep them in sync.
"""

from collections import defaultdict
from datetime import date, datetime, timedelta

from .. import db
from ..util import at_local, day_bounds

EVENT_TYPES = {"check": ("reading",), "medicine": ("bolus", "basal"), "meal": ("meal",), "activity": ("activity",)}

# The child's side is generated from the clinical fields: clinicians write medicine, not game content.
MOMENT = {"morning": "Morning", "lunch": "Lunchtime", "afternoon": "Afternoon", "dinner": "Dinner", "bedtime": "Bedtime"}
QUEST_PATTERN = {
    "check": ("{moment} check-up with Dotty", "Check-up with Dotty"),
    "medicine": ("{moment} medicine with Dotty", "Medicine time with Dotty"),
    "meal": ("{moment} meal with Dotty", "Eat together with Dotty"),
    "activity": ("Play time with Dotty", "Play time with Dotty"),
    "custom": ("Dotty's special mission", "Dotty's special mission"),
}
# Priority as the clinician sets it -> how much the child's side cares.
PRIORITY_DOTS = {1: 15, 2: 25, 3: 40}


def moment_of(hhmm: str | None) -> str | None:
    """Which part of the day a time falls in, for the child's wording."""
    if not hhmm:
        return None
    h = int(hhmm[:2])
    return "morning" if h < 11 else "lunch" if h < 14 else "afternoon" if h < 17 else "dinner" if h < 20 else "bedtime"


def quest_title_for(kind: str, time: str | None) -> str:
    """The child's quest name, built from the task's type and time of day."""
    with_moment, without = QUEST_PATTERN[kind]
    moment = moment_of(time)
    return with_moment.format(moment=MOMENT[moment]) if moment else without


def reward_for(importance: int) -> int:
    return PRIORITY_DOTS.get(importance, 25)

# What the child's app may see of a task: game wording and timing only, never the doctor's title or instructions.
CHILD_FIELDS = ("quest_title", "kind", "time", "window_min", "days", "target_minutes", "importance", "reward_dots")


def child_view(task: dict) -> dict:
    return {"id": task["_id"], **{k: task.get(k) for k in CHILD_FIELDS}}


def full_view(task: dict) -> dict:
    out = {("id" if k == "_id" else k): v for k, v in task.items()}
    return out


def _sort_key(task: dict) -> str:
    return task.get("time") or "99:99"


def active_tasks(patient_id: str) -> list[dict]:
    return sorted(db.tasks.find({"patient_id": patient_id, "active": True, "archived": {"$ne": True}}), key=_sort_key)


def due_on(task: dict, day: date, tz) -> bool:
    if task.get("days") and day.weekday() not in task["days"]:
        return False
    created = task.get("created_at")
    return created is None or created.astimezone(tz).date() <= day


def tasks_for(patient_id: str, day: date, tz, tasks: list[dict] | None = None) -> list[dict]:
    return [t for t in (tasks if tasks is not None else active_tasks(patient_id)) if due_on(t, day, tz)]


def window(task: dict, day: date, tz) -> tuple[datetime, datetime]:
    if not task.get("time"):
        return day_bounds(day, tz)
    centre = at_local(day, task["time"], tz)
    w = timedelta(minutes=task.get("window_min", 60))
    return centre - w, centre + w


def task_status(task: dict, day_events: list[dict], day: date, tz, at: datetime) -> dict:
    """{status: done | pending | missed, done_at} for one task on one local day. `day_events` = that day's real events."""
    start, end = window(task, day, tz)
    done_at = None
    kind = task["kind"]
    if kind == "custom":
        hits = [e for e in day_events if e["type"] == "task" and e["data"].get("task_id") == task["_id"]]
        done_at = min((e["ts"] for e in hits), default=None)
    elif kind == "activity":
        total = 0
        for e in sorted((e for e in day_events if e["type"] == "activity"), key=lambda e: e["ts"]):
            total += e["data"].get("minutes", 0)
            if total >= (task.get("target_minutes") or 20):
                done_at = e["ts"]
                break
    else:
        types = EVENT_TYPES[kind]
        hits = [e["ts"] for e in day_events if e["type"] in types and start <= e["ts"] <= end]
        done_at = min(hits, default=None)
    if done_at is not None:
        return {"status": "done", "done_at": done_at}
    if task.get("time") and at > end:
        return {"status": "missed", "done_at": None}
    if not task.get("time") and at >= day_bounds(day, tz)[1]:
        return {"status": "missed", "done_at": None}
    return {"status": "pending", "done_at": None}


def events_between(patient_id: str, start: datetime, end: datetime) -> list[dict]:
    return list(
        db.events.find({"patient_id": patient_id, **db.TRUSTED, "ts": {"$gte": start, "$lt": end}}).sort("ts", 1)
    )


def day_summary(patient_id: str, day: date, tz, at: datetime, tasks: list[dict] | None = None) -> list[dict]:
    due = tasks_for(patient_id, day, tz, tasks)
    if not due:
        return []
    start, end = day_bounds(day, tz)
    evs = events_between(patient_id, start, end)
    return [{"task": t, **task_status(t, evs, day, tz, at)} for t in due]


def weighted_adherence(summary: list[dict]) -> float | None:
    """Importance-weighted share of today's tasks that are done (upcoming ones count as not done yet)."""
    total = sum(s["task"].get("importance", 2) for s in summary)
    if not total:
        return None
    return sum(s["task"].get("importance", 2) for s in summary if s["status"] == "done") / total


def adherence(patient_id: str, days: int, tz, at: datetime) -> dict:
    """Grid for the clinician portal: one row per active task, one cell per day (done / missed / pending / None)."""
    today = at.astimezone(tz).date()
    day_list = [today - timedelta(days=i) for i in range(days - 1, -1, -1)]
    tasks = active_tasks(patient_id)
    start = day_bounds(day_list[0], tz)[0]
    by_day: dict[date, list[dict]] = defaultdict(list)
    for e in events_between(patient_id, start, day_bounds(today, tz)[1]):
        by_day[e["ts"].astimezone(tz).date()].append(e)
    rows = []
    done = missed = 0
    for t in tasks:
        cells = []
        for d in day_list:
            if not due_on(t, d, tz):
                cells.append(None)
                continue
            st = task_status(t, by_day[d], d, tz, at)["status"]
            cells.append(st)
            done += st == "done"
            missed += st == "missed"
        rows.append({"task": full_view(t), "cells": cells})
    return {
        "days": [d.isoformat() for d in day_list],
        "rows": rows,
        "rate_pct": round(100 * done / (done + missed)) if done + missed else None,
    }


def friendly_time(hhmm: str | None) -> str:
    """How the child's app talks about a task's time: a moment of the day, not a clock."""
    if not hhmm:
        return "any time today"
    h = int(hhmm[:2])
    if h < 11:
        return "in the morning"
    if h < 14:
        return "at lunch"
    if h < 17:
        return "in the afternoon"
    if h < 20:
        return "at dinner"
    return "at bedtime"
