from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

DEFAULT_TZ = "America/New_York"


def now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid4().hex


def zone(tz: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(tz or DEFAULT_TZ)
    except Exception:
        return ZoneInfo(DEFAULT_TZ)


def hhmm(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


def at_local(day: date, hhmm_str: str, tz: ZoneInfo) -> datetime:
    """The aware datetime for HH:MM on a local calendar day."""
    return datetime.combine(day, hhmm(hhmm_str), tzinfo=tz)


def day_bounds(day: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """UTC [start, end) of a local calendar day."""
    start = datetime.combine(day, time(0, 0), tzinfo=tz)
    end = datetime.combine(day + timedelta(days=1), time(0, 0), tzinfo=tz)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def pub(doc: dict | None) -> dict | None:
    """Public JSON shape of a Mongo document: `_id` -> `id`, secrets and internals removed."""
    if doc is None:
        return None
    out = {("id" if k == "_id" else k): v for k, v in doc.items()}
    for hidden in ("password_hash", "dedupe", "streak_awards"):
        out.pop(hidden, None)
    return out
