import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import db

SECRET = os.getenv("JWT_SECRET", "dotty-dev-secret-change-me-before-deploying")
ALGO = "HS256"
TOKEN_DAYS = 30

bearer = HTTPBearer(auto_error=False)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except ValueError:
        return False


def make_token(user: dict) -> str:
    payload = {
        "sub": user["_id"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    if creds is None:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=[ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = db.users.find_one({"_id": payload["sub"]})
    if not user:
        raise HTTPException(401, "Unknown user")
    return user


def require_role(*roles: str):
    def dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, f"Requires role: {', '.join(roles)}")
        return user

    return dep


# --- who may see which patient (the patient is the child user) -----------------------------


def family_of(user: dict) -> dict | None:
    return db.families.find_one({"_id": user["family_id"]}) if user.get("family_id") else None


def patient_for(user: dict) -> str | None:
    """The patient a child/parent account is about (a child is their own patient)."""
    if user["role"] == "child":
        return user["_id"]
    if user["role"] == "parent":
        fam = family_of(user)
        return fam["child_id"] if fam else None
    return None


def check_access(user: dict, patient_id: str) -> None:
    if user["role"] == "clinician":
        ok = patient_id in user.get("patient_ids", [])
    else:
        ok = patient_for(user) == patient_id
    if not ok:
        raise HTTPException(403, "No access to this patient")


def family_of_patient(patient_id: str) -> dict | None:
    child = db.users.find_one({"_id": patient_id}, {"family_id": 1, "name": 1})
    if not child or not child.get("family_id"):
        return None
    return db.families.find_one({"_id": child["family_id"]})
