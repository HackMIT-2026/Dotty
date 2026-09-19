from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..auth import check_access, family_of, require_role
from ..models import BuyIn, EquipIn
from ..services import gamification
from ..services.alerts import notify
from ..util import day_bounds, now, pub, zone

router = APIRouter(tags=["pet"])

MAX_HIGH_FIVES_PER_DAY = 5


def _tz(user: dict) -> str | None:
    fam = family_of(user)
    return fam.get("tz") if fam else None


@router.get("/shop")
def shop(user: dict = Depends(require_role("child", "parent"))):
    return [pub(i) for i in db.shop_items.find().sort([("slot", 1), ("price", 1)])]


@router.get("/pet/{patient_id}")
def get_pet(patient_id: str, user: dict = Depends(require_role("child", "parent"))):
    check_access(user, patient_id)
    return gamification.pet_view(gamification.get_pet(patient_id), _tz(user))


@router.post("/pet/{patient_id}/buy")
def buy(patient_id: str, body: BuyIn, user: dict = Depends(require_role("child"))):
    check_access(user, patient_id)
    item = db.shop_items.find_one({"_id": body.item_id})
    if not item:
        raise HTTPException(404, "No such item")
    pet = gamification.get_pet(patient_id)
    if item["_id"] in pet["owned_items"]:
        raise HTTPException(409, "Already owned")
    if item.get("unlock_badge") and item["unlock_badge"] not in pet["badges"]:
        raise HTTPException(403, f"Earn the {gamification.BADGES[item['unlock_badge']]} badge to unlock this")
    if pet["dots"] < item["price"]:
        raise HTTPException(402, "Not enough Dots yet")
    pet["dots"] -= item["price"]  # xp is not spent: levels never go backwards
    pet["owned_items"].append(item["_id"])
    db.pets.replace_one({"_id": pet["_id"]}, pet)
    return gamification.pet_view(pet, _tz(user))


@router.post("/pet/{patient_id}/equip")
def equip(patient_id: str, body: EquipIn, user: dict = Depends(require_role("child"))):
    check_access(user, patient_id)
    pet = gamification.get_pet(patient_id)
    if body.item_id is not None:
        item = db.shop_items.find_one({"_id": body.item_id})
        if not item or item["slot"] != body.slot:
            raise HTTPException(400, "That item doesn't fit this slot")
        if body.item_id not in pet["owned_items"]:
            raise HTTPException(403, "You don't own that yet")
    elif body.slot in ("color", "background"):
        raise HTTPException(400, "Pick a color or background instead of removing it")
    pet["equipped"][body.slot] = body.item_id
    db.pets.replace_one({"_id": pet["_id"]}, pet)
    return gamification.pet_view(pet, _tz(user))


@router.post("/pet/{patient_id}/high-five")
def high_five(patient_id: str, user: dict = Depends(require_role("parent"))):
    """A parent cheers their child on: +5 Dots and a notification on the child's phone."""
    check_access(user, patient_id)
    tz = zone(_tz(user))
    start, end = day_bounds(now().astimezone(tz).date(), tz)
    sent = db.notifications.count_documents(
        {"user_id": patient_id, "kind": "high_five", "data.from": user["_id"], "created_at": {"$gte": start, "$lt": end}}
    )
    if sent >= MAX_HIGH_FIVES_PER_DAY:
        raise HTTPException(429, "That's plenty of high-fives for today!")
    pet = gamification.get_pet(patient_id)
    pet["dots"] += gamification.DOTS_HIGH_FIVE
    pet["xp"] += gamification.DOTS_HIGH_FIVE
    db.pets.replace_one({"_id": pet["_id"]}, pet)
    notify(patient_id, "high_five", f"{user['name']} sent you a high five!", "+5 Dots", {"from": user["_id"], "dots": gamification.DOTS_HIGH_FIVE})
    return gamification.pet_view(pet, _tz(user))
