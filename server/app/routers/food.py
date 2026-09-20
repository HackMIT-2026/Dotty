"""The food box: what the child types, what the grown-ups get told.

The child's app posts words ("mac and cheese"), not grams, and gets words back. Carbs only ever travel to a
parent or a clinician — see services/food.py for why, and routers/sync.py for the child's redacted event feed.
"""

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..auth import current_user, family_of, patient_for, require_role
from ..models import FoodIn, MealCarbsIn
from ..services import alerts, food
from ..util import now, pub

router = APIRouter(tags=["food"])


@router.post("/food/estimate")
def estimate(body: FoodIn, user: dict = Depends(require_role("child", "parent"))):
    """Look up what the child typed. A child hears the food's name and whether a grown-up should check it."""
    est = food.estimate(body.text)
    if user["role"] == "child":
        return food.kid_view(est)
    return est


@router.post("/meals/{event_id}/carbs")
def set_carbs(event_id: str, body: MealCarbsIn, user: dict = Depends(require_role("parent", "clinician"))):
    """A grown-up's number wins over any estimate, and the dose helper uses it from here on."""
    pid = patient_for(user) if user["role"] == "parent" else None
    event = db.events.find_one({"_id": event_id, "type": "meal"})
    if not event or (pid and event["patient_id"] != pid):
        raise HTTPException(404, "No such meal")
    db.events.update_one(
        {"_id": event_id},
        {"$set": {"data.carbs_g": body.carbs_g, "data.carbs_source": "parent", "data.needs_parent": False, "data.confirmed_at": now()}},
    )
    label = ", ".join(i["label"] for i in event["data"].get("items", [])) or "Your meal"
    alerts.help_answered(event["patient_id"], label)
    db.notifications.update_many({"data.event_id": event_id, "read_at": None}, {"$set": {"read_at": now()}})
    return pub(db.events.find_one({"_id": event_id}))


@router.get("/food/pending")
def pending(user: dict = Depends(require_role("parent", "clinician"))):
    """Meals still waiting for a grown-up's number."""
    pid = patient_for(user) if user["role"] == "parent" else None
    if not pid:
        raise HTTPException(400, "There is no child in this family yet")
    items = db.events.find({"patient_id": pid, "type": "meal", "data.needs_parent": True}).sort("ts", -1).limit(20)
    return [pub(e) for e in items]
