from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

EventType = Literal["reading", "bolus", "basal", "meal", "activity", "pet"]
Intensity = Literal["light", "moderate", "vigorous"]
HHMM = r"^([01]\d|2[0-3]):[0-5]\d$"


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=6, max_length=72)
    role: Literal["child", "parent", "clinician"]
    family_code: str | None = None
    tz: str | None = None


class LoginIn(BaseModel):
    email: str
    password: str


def _num(v, lo: float, hi: float) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and lo <= v <= hi


class EventIn(BaseModel):
    client_id: str = Field(min_length=8, max_length=64)
    type: EventType
    ts: datetime
    source: Literal["manual", "parent", "simulator", "camera"] = "manual"
    data: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def check_data(self):
        d = self.data
        if self.type == "reading" and not _num(d.get("bg_mgdl"), 20, 600):
            raise ValueError("reading needs bg_mgdl between 20 and 600")
        if self.type == "meal" and not _num(d.get("carbs_g"), 0, 300):
            raise ValueError("meal needs carbs_g between 0 and 300")
        if self.type == "activity":
            if not _num(d.get("minutes"), 1, 300):
                raise ValueError("activity needs minutes between 1 and 300")
            if d.get("intensity", "moderate") not in ("light", "moderate", "vigorous"):
                raise ValueError("activity intensity must be light, moderate or vigorous")
        if self.type in ("bolus", "basal") and d.get("units") is not None and not _num(d["units"], 0, 100):
            raise ValueError("units must be between 0 and 100")
        return self


class SyncPushIn(BaseModel):
    events: list[EventIn] = Field(max_length=500)


class ICRSlot(BaseModel):
    start: str = Field(pattern=HHMM)
    g_per_unit: float = Field(gt=0)


class Target(BaseModel):
    low: float = 70
    high: float = 180


class Reminder(BaseModel):
    time: str = Field(pattern=HHMM)
    kind: Literal["check", "meal", "bedtime"] = "check"
    window_min: int = Field(60, ge=5, le=240)
    label: str | None = None


class ActivityRules(BaseModel):
    """Percent to reduce a bolus by, per activity intensity."""

    light: float = Field(0, ge=0, le=100)
    moderate: float = Field(25, ge=0, le=100)
    vigorous: float = Field(50, ge=0, le=100)


class BasalSlot(BaseModel):
    time: str = Field(pattern=HHMM)
    units: float = Field(ge=0)


class PlanIn(BaseModel):
    icr: list[ICRSlot] = Field(min_length=1)
    isf_mgdl_per_unit: float = Field(gt=0)
    target: Target = Field(default_factory=Target)
    correction_target: float = 120
    max_bolus: float = Field(10, gt=0)
    basal: list[BasalSlot] = Field(default_factory=list)
    reminders: list[Reminder] = Field(default_factory=list)
    activity_rules: ActivityRules = Field(default_factory=ActivityRules)
    notes: str = ""


class DoseIn(BaseModel):
    patient_id: str | None = None
    carbs_g: float = Field(ge=0, le=300)
    bg_mgdl: float = Field(ge=20, le=600)
    activity: Literal["none", "light", "moderate", "vigorous"] | None = None


class FamilySettingsIn(BaseModel):
    glucose_unit: Literal["mg/dL", "mmol/L"]


class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class BuyIn(BaseModel):
    item_id: str


class EquipIn(BaseModel):
    slot: Literal["color", "hat", "accessory", "background"]
    item_id: str | None = None


class SimIn(BaseModel):
    scenario: Literal["normal", "high", "low", "skip_lunch"] = "normal"
    speed: int = Field(1, ge=1, le=60)
