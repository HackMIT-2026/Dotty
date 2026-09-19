from pydantic import BaseModel, Field

TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"


class TimeWindow(BaseModel):
    start: str = Field(pattern=TIME_PATTERN, examples=["07:00"])
    end: str = Field(pattern=TIME_PATTERN, examples=["09:00"])


class TreatmentPlanCreate(BaseModel):
    patient_id: str = Field(min_length=1)
    task: str = Field(min_length=1, description="The real treatment task, for example 'Check glucose'.")
    window: TimeWindow
    # Fixed by the task. Added to the pet's energy. Never depends on a logged value.
    reward: int = Field(ge=0, le=100)
    why_text: str = Field(min_length=1, description="Short 'Why am I doing this?' line in the child's wording.")
    title: str | None = Field(default=None, description="Optional child friendly quest title. Defaults to task.")


class TreatmentPlan(TreatmentPlanCreate):
    id: str
