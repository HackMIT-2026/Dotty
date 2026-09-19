from fastapi import APIRouter, Depends, HTTPException, Query

from .. import db
from ..auth import check_access, current_user, family_of_patient, require_role
from ..models import TaskIn
from ..services import alerts
from ..services import tasks as care
from ..util import new_id, now, zone

router = APIRouter(tags=["care plan"])


def _describe(t: dict) -> str:
    return f"{t['title']} ({t['time']})" if t.get("time") else t["title"]


def _get(patient_id: str, task_id: str) -> dict:
    task = db.tasks.find_one({"_id": task_id, "patient_id": patient_id, "archived": {"$ne": True}})
    if not task:
        raise HTTPException(404, "No such task")
    return task


@router.get("/patients/{patient_id}/tasks")
def list_tasks(patient_id: str, include_inactive: bool = False, user: dict = Depends(current_user)):
    """The daily care plan. Children get the game view only (no doctor wording, no instructions)."""
    check_access(user, patient_id)
    query: dict = {"patient_id": patient_id, "archived": {"$ne": True}}
    if not (include_inactive and user["role"] == "clinician"):
        query["active"] = True
    tasks = sorted(db.tasks.find(query), key=lambda t: t.get("time") or "99:99")
    view = care.child_view if user["role"] == "child" else care.full_view
    return [view(t) for t in tasks]


@router.post("/patients/{patient_id}/tasks")
def create_task(patient_id: str, body: TaskIn, user: dict = Depends(require_role("clinician"))):
    check_access(user, patient_id)
    task = {
        "_id": new_id(),
        "patient_id": patient_id,
        "clinician_id": user["_id"],
        **body.model_dump(),
        "created_at": now(),
        "updated_at": now(),
    }
    task.update(quest_title=care.quest_title_for(task["kind"], task["time"]), reward_dots=care.reward_for(task["importance"]))
    db.tasks.insert_one(task)
    alerts.plan_changed(patient_id, user["name"], f"added {_describe(task)} to the care plan.")
    return care.full_view(task)


@router.put("/patients/{patient_id}/tasks/{task_id}")
def update_task(patient_id: str, task_id: str, body: TaskIn, user: dict = Depends(require_role("clinician"))):
    check_access(user, patient_id)
    task = _get(patient_id, task_id)
    task.update(body.model_dump(), updated_at=now())
    task.update(quest_title=care.quest_title_for(task["kind"], task["time"]), reward_dots=care.reward_for(task["importance"]))
    db.tasks.replace_one({"_id": task_id}, task)
    what = "changed" if task["active"] else "paused"
    alerts.plan_changed(patient_id, user["name"], f"{what} {_describe(task)} in the care plan.")
    return care.full_view(task)


@router.delete("/patients/{patient_id}/tasks/{task_id}")
def delete_task(patient_id: str, task_id: str, user: dict = Depends(require_role("clinician"))):
    """Archive (not erase) so past adherence stays explainable."""
    check_access(user, patient_id)
    task = _get(patient_id, task_id)
    db.tasks.update_one({"_id": task_id}, {"$set": {"archived": True, "active": False, "updated_at": now()}})
    alerts.plan_changed(patient_id, user["name"], f"removed {_describe(task)} from the care plan.")
    return {"ok": True}


@router.get("/patients/{patient_id}/adherence")
def get_adherence(patient_id: str, days: int = Query(14, ge=1, le=60), user: dict = Depends(require_role("clinician", "parent"))):
    check_access(user, patient_id)
    fam = family_of_patient(patient_id) or {}
    return care.adherence(patient_id, days, zone(fam.get("tz")), now())
