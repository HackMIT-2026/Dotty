from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..auth import current_user
from ..util import now, pub

router = APIRouter(tags=["notifications"])


@router.get("/notifications")
def list_notifications(user: dict = Depends(current_user)):
    items = list(db.notifications.find({"user_id": user["_id"]}).sort("created_at", -1).limit(100))
    return {
        "unread": db.notifications.count_documents({"user_id": user["_id"], "read_at": None}),
        "notifications": [pub(n) for n in items],
    }


@router.post("/notifications/read-all")
def read_all(user: dict = Depends(current_user)):
    res = db.notifications.update_many({"user_id": user["_id"], "read_at": None}, {"$set": {"read_at": now()}})
    return {"updated": res.modified_count}


@router.post("/notifications/{notification_id}/read")
def mark_read(notification_id: str, user: dict = Depends(current_user)):
    res = db.notifications.update_one({"_id": notification_id, "user_id": user["_id"]}, {"$set": {"read_at": now()}})
    if not res.matched_count:
        raise HTTPException(404, "No such notification")
    return {"ok": True}
