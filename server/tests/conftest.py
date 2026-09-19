import os

# Must be set before the app is imported. Tests use their own database, never the demo one.
os.environ["MONGO_DB"] = "dotty_test"
os.environ["DOTTY_DISABLE_SCHEDULER"] = "1"

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app
from app.services import shop

CHILD_PIN = "4321"

PLAN = {
    "icr": [{"start": "00:00", "g_per_unit": 10}],
    "isf_mgdl_per_unit": 50,
    "target": {"low": 70, "high": 180},
    "correction_target": 120,
    "max_bolus": 10,
    "reminders": [{"time": "12:00", "kind": "meal", "window_min": 60, "label": "lunch check"}],
    "activity_rules": {"light": 0, "moderate": 25, "vigorous": 50},
}


@pytest.fixture(autouse=True)
def clean_db():
    for name in db.COLLECTIONS:
        db.db[name].drop()
    db.ensure_indexes()
    shop.ensure_items()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register(client, name, role, family_code=None, tz="America/New_York"):
    """Grown-ups sign up with an email; children join with the family code and a PIN."""
    if role == "child":
        return register_child(client, name, family_code)
    body = {"name": name, "email": f"{name.lower()}-{uuid.uuid4().hex[:6]}@t.io", "password": "secret1", "role": role, "tz": tz}
    if family_code:
        body["family_code"] = family_code
    r = client.post("/auth/register", json=body)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


def register_child(client, name, family_code, pin=CHILD_PIN):
    r = client.post("/auth/child/register", json={"name": name, "family_code": family_code, "pin": pin})
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


@pytest.fixture
def family(client):
    """Parent + child + clinician in one family, with a plan set."""
    ptoken, parent = register(client, "Alex", "parent")
    code = client.get("/me", headers=auth(ptoken)).json()["family"]["code"]
    ctoken, child = register(client, "Maya", "child", code)
    dtoken, doc = register(client, "DrLee", "clinician", code)
    r = client.put(f"/patients/{child['id']}/plan", json=PLAN, headers=auth(dtoken))
    assert r.status_code == 200, r.text
    return {
        "code": code,
        "parent": {"token": ptoken, "h": auth(ptoken), **parent},
        "child": {"token": ctoken, "h": auth(ctoken), **child},
        "doc": {"token": dtoken, "h": auth(dtoken), **doc},
        "pid": child["id"],
    }


def make_event(type_, data, minutes_ago=0, client_id=None, source="manual"):
    ts = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return {"client_id": client_id or uuid.uuid4().hex, "type": type_, "ts": ts.isoformat(), "source": source, "data": data}


def push(client, who, *events):
    r = client.post("/sync/push", json={"events": list(events)}, headers=who["h"])
    assert r.status_code == 200, r.text
    return r.json()


def add_task(client, family, **overrides):
    """Create a care-plan task as the family's clinician."""
    body = {"title": "Lunch glucose check", "kind": "check", "time": "12:00", "window_min": 60, **overrides}
    r = client.post(f"/patients/{family['pid']}/tasks", json=body, headers=family["doc"]["h"])
    assert r.status_code == 200, r.text
    return r.json()
