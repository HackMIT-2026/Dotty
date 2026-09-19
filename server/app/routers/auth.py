import secrets

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..auth import current_user, family_of, hash_password, make_token, require_role, verify_password
from ..models import FamilySettingsIn, LoginIn, RegisterIn
from ..services import gamification
from ..util import DEFAULT_TZ, new_id, now, pub

router = APIRouter(tags=["auth"])

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I


def _new_code() -> str:
    while True:
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        if not db.families.find_one({"code": code}):
            return code


def _family_view(fam: dict | None) -> dict | None:
    if not fam:
        return None
    people = {u["_id"]: u for u in db.users.find({"_id": {"$in": [i for i in [fam.get("child_id"), fam.get("clinician_id"), *fam.get("parent_ids", [])] if i]}})}

    def brief(uid):
        u = people.get(uid)
        return {"id": uid, "name": u["name"]} if u else None

    return {
        "id": fam["_id"],
        "code": fam["code"],
        "tz": fam.get("tz", DEFAULT_TZ),
        "glucose_unit": fam.get("glucose_unit", "mg/dL"),
        "child": brief(fam.get("child_id")),
        "parents": [brief(p) for p in fam.get("parent_ids", [])],
        "clinician": brief(fam.get("clinician_id")),
    }


@router.post("/auth/register")
def register(body: RegisterIn):
    email = body.email.strip().lower()
    if db.users.find_one({"email": email}):
        raise HTTPException(409, "That email is already registered")

    fam = None
    if body.family_code:
        fam = db.families.find_one({"code": body.family_code.strip().upper()})
        if not fam:
            raise HTTPException(404, "Family code not found")
    if body.role in ("child", "clinician") and not fam:
        raise HTTPException(400, "A family code is required")

    user = {
        "_id": new_id(),
        "role": body.role,
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "family_id": None,
        "patient_ids": [],
        "created_at": now(),
    }

    if body.role == "parent":
        if not fam:
            fam = {"_id": new_id(), "code": _new_code(), "child_id": None, "parent_ids": [], "clinician_id": None, "tz": body.tz or DEFAULT_TZ, "glucose_unit": "mg/dL", "created_at": now()}
            db.families.insert_one(fam)
        db.families.update_one({"_id": fam["_id"]}, {"$addToSet": {"parent_ids": user["_id"]}})
        user["family_id"] = fam["_id"]
    elif body.role == "child":
        if fam.get("child_id"):
            raise HTTPException(409, "This family already has a child")
        db.families.update_one({"_id": fam["_id"]}, {"$set": {"child_id": user["_id"]}})
        user["family_id"] = fam["_id"]
        if fam.get("clinician_id"):
            db.users.update_one({"_id": fam["clinician_id"]}, {"$addToSet": {"patient_ids": user["_id"]}})
    else:  # clinician
        if fam.get("clinician_id"):
            raise HTTPException(409, "This family already has a clinician")
        db.families.update_one({"_id": fam["_id"]}, {"$set": {"clinician_id": user["_id"]}})
        if fam.get("child_id"):
            user["patient_ids"] = [fam["child_id"]]

    db.users.insert_one(user)
    if body.role == "child":
        gamification.get_pet(user["_id"])
    return {"token": make_token(user), "user": pub(user)}


@router.post("/auth/login")
def login(body: LoginIn):
    user = db.users.find_one({"email": body.email.strip().lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Wrong email or password")
    return {"token": make_token(user), "user": pub(user)}


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return {"user": pub(user), "family": _family_view(family_of(user))}


@router.post("/families")
def my_family(user: dict = Depends(require_role("parent"))):
    """A parent's family (created at registration). Share its code so the child and clinician can join."""
    return _family_view(family_of(user))


@router.put("/families/settings")
def update_family_settings(body: FamilySettingsIn, user: dict = Depends(require_role("parent"))):
    """Family preferences. `glucose_unit` changes how glucose is shown and entered everywhere; storage stays mg/dL."""
    fam = family_of(user)
    if not fam:
        raise HTTPException(404, "No family")
    db.families.update_one({"_id": fam["_id"]}, {"$set": {"glucose_unit": body.glucose_unit}})
    return _family_view(db.families.find_one({"_id": fam["_id"]}))
