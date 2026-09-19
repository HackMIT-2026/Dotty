from datetime import datetime, timedelta, timezone

from app import db
from app.services import alerts, gamification

from .conftest import PLAN, auth, make_event, push, register


# --- accounts and access -------------------------------------------------------------------


def test_join_flow_and_roles(client, family):
    me = client.get("/me", headers=family["parent"]["h"]).json()
    assert me["family"]["child"]["name"] == "Maya"
    assert me["family"]["clinician"]["name"] == "DrLee"
    patients = client.get("/patients", headers=family["doc"]["h"]).json()
    assert [p["id"] for p in patients] == [family["pid"]]
    assert patients[0]["family_code"] == family["code"]


def test_wrong_code_and_duplicate_email_rejected(client, family):
    r = client.post("/auth/register", json={"name": "X", "email": "x@t.io", "password": "secret1", "role": "child", "family_code": "NOPE00"})
    assert r.status_code == 404
    r = client.post("/auth/register", json={"name": "Y", "email": "x@t.io", "password": "secret1", "role": "child"})
    assert r.status_code == 400  # code required
    _, u = register(client, "Dup", "parent")
    r = client.post("/auth/register", json={"name": "Dup", "email": u["email"], "password": "secret1", "role": "parent"})
    assert r.status_code == 409


def test_login_and_bad_password(client, family):
    email = family["parent"]["email"]
    assert client.post("/auth/login", json={"email": email, "password": "secret1"}).status_code == 200
    assert client.post("/auth/login", json={"email": email, "password": "wrong"}).status_code == 401
    assert client.get("/me").status_code == 401


def test_role_and_patient_isolation(client, family):
    # clinicians can't push events, children can't read the dose helper or edit plans
    assert client.post("/sync/push", json={"events": []}, headers=family["doc"]["h"]).status_code == 403
    assert client.post("/dose/suggest", json={"carbs_g": 30, "bg_mgdl": 120}, headers=family["child"]["h"]).status_code == 403
    assert client.put(f"/patients/{family['pid']}/plan", json=PLAN, headers=family["child"]["h"]).status_code == 403
    # a second family can't see this patient
    other_token, _ = register(client, "Other", "parent")
    assert client.get(f"/patients/{family['pid']}/events", headers=auth(other_token)).status_code == 403


# --- offline sync ---------------------------------------------------------------------------


def test_push_is_idempotent(client, family):
    e = make_event("reading", {"bg_mgdl": 130}, client_id="abcdef123456")
    first = push(client, family["child"], e)
    second = push(client, family["child"], e)
    assert first["new_count"] == 1 and second["new_count"] == 0
    assert db.events.count_documents({"patient_id": family["pid"]}) == 1
    assert first["pet"]["dots"] == 10 and second["pet"]["dots"] == 10  # rewarded once
    assert second["accepted_ids"] == ["abcdef123456"]


def test_pull_returns_events_plan_pet_and_since_cursor(client, family):
    push(client, family["child"], make_event("meal", {"carbs_g": 30, "items": []}))
    first = client.get("/sync/pull", headers=family["parent"]["h"]).json()
    assert len(first["events"]) == 1 and first["plan"]["version"] == 1
    assert first["patient"]["name"] == "Maya" and "dots" in first["pet"]

    push(client, family["child"], make_event("reading", {"bg_mgdl": 100}))
    delta = client.get("/sync/pull", params={"since": first["server_time"]}, headers=family["parent"]["h"]).json()
    assert [e["type"] for e in delta["events"]] == ["reading"]


def test_invalid_events_are_rejected(client, family):
    bad = make_event("reading", {"bg_mgdl": 5})
    r = client.post("/sync/push", json={"events": [bad]}, headers=family["child"]["h"])
    assert r.status_code == 422


def test_devices_cannot_forge_simulator_source_or_future_time(client, family):
    ev = make_event("reading", {"bg_mgdl": 120}, source="simulator")
    ev["ts"] = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    result = push(client, family["child"], ev)
    stored = db.events.find_one({"patient_id": family["pid"]})
    assert stored["source"] == "manual"
    assert stored["ts"] <= datetime.now(timezone.utc)
    assert result["pet"]["dots"] >= 10  # not treated as simulator, so it earned Dots


def test_parent_logged_events_are_sourced_as_parent(client, family):
    push(client, family["parent"], make_event("bolus", {"units": 3.5, "reason": "meal"}))
    assert db.events.find_one({"patient_id": family["pid"]})["source"] == "parent"


# --- gamification ---------------------------------------------------------------------------


def test_reward_rules(client, family):
    r = push(client, family["child"], make_event("meal", {"carbs_g": 40, "items": []}, minutes_ago=5))
    assert r["pet"]["dots"] == 10
    r = push(client, family["child"], make_event("activity", {"minutes": 45, "intensity": "moderate"}))
    assert r["pet"]["dots"] == 10 + 25  # 10 + 5 per full 15 min (capped at +30)
    r = push(client, family["child"], make_event("bolus", {}))  # "medicine taken", no dose visible to the child
    assert r["pet"]["dots"] == 45
    r = push(client, family["child"], make_event("activity", {"minutes": 240, "intensity": "light"}))
    assert r["rewards"][0]["dots"] == 10 + 30  # cap


def test_readings_earn_dots_only_up_to_the_daily_cap(client, family):
    events = [make_event("reading", {"bg_mgdl": 100 + i}, minutes_ago=i) for i in range(12)]
    r = push(client, family["child"], *events)
    assert r["new_count"] == 12  # all stored...
    assert r["pet"]["dots"] == gamification.MAX_REWARDED_READINGS_PER_DAY * gamification.DOTS_READING  # ...but only 8 pay


def test_simulator_readings_never_earn_rewards(client, family):
    from app.services.ingest import ingest

    out = ingest(family["pid"], [{"client_id": "sim-abcdef01", "type": "reading", "ts": datetime.now(timezone.utc), "source": "simulator", "data": {"bg_mgdl": 120}}])
    assert len(out["new_events"]) == 1 and out["rewards"] == []
    assert gamification.get_pet(family["pid"])["dots"] == 0


def test_pet_view_never_leaks_glucose_and_mood_follows_latest_reading(client, family):
    r = push(client, family["child"], make_event("reading", {"bg_mgdl": 62}, minutes_ago=10))
    assert r["pet"]["mood"] == "shaky"
    assert "bg_mgdl" not in str(r["pet"]) and "62" not in str(r["pet"]["mood_message"])
    r = push(client, family["child"], make_event("reading", {"bg_mgdl": 250}))
    assert r["pet"]["mood"] == "sluggish"
    r = push(client, family["child"], make_event("reading", {"bg_mgdl": 130}, minutes_ago=30))  # older: doesn't change mood
    assert r["pet"]["mood"] == "sluggish"


def test_sleepy_when_no_recent_reading(client, family):
    assert client.get(f"/pet/{family['pid']}", headers=family["child"]["h"]).json()["mood"] == "sleepy"
    push(client, family["child"], make_event("reading", {"bg_mgdl": 130}, minutes_ago=5 * 60))
    assert client.get(f"/pet/{family['pid']}", headers=family["child"]["h"]).json()["mood"] == "sleepy"


def test_daily_quests_bonus_awarded_once(client, family):
    tz = gamification.zone("America/New_York")
    today = datetime.now(timezone.utc).astimezone(tz).date()
    lunch_ts = datetime.combine(today, datetime.min.time().replace(hour=12), tzinfo=tz)
    db.events.insert_one({"_id": "lunch", "client_id": "lunch-clientid", "patient_id": family["pid"], "type": "meal", "ts": lunch_ts, "source": "manual", "data": {"carbs_g": 45}, "created_at": lunch_ts})
    checks = [make_event("reading", {"bg_mgdl": 110 + i}, minutes_ago=i) for i in range(4)]
    r = push(client, family["child"], *checks, make_event("activity", {"minutes": 25, "intensity": "moderate"}))
    quest_rewards = [x for x in r["rewards"] if x["kind"] == "quests"]
    assert len(quest_rewards) == 1 and quest_rewards[0]["dots"] == 50
    assert all(q["done"] for q in r["pet"]["quests"])
    again = push(client, family["child"], make_event("reading", {"bg_mgdl": 105}))
    assert not [x for x in again["rewards"] if x["kind"] == "quests"]


def test_streak_of_three_days_awards_milestone_once(client, family):
    pid = family["pid"]
    tz = gamification.zone("America/New_York")
    today = datetime.now(timezone.utc).astimezone(tz).date()
    docs = []
    for back in (1, 2):  # two prior days with 3 readings each
        for h in (8, 12, 18):
            ts = datetime.combine(today - timedelta(days=back), datetime.min.time().replace(hour=h), tzinfo=tz)
            docs.append({"_id": f"h{back}{h}", "client_id": f"hist-{back}-{h}", "patient_id": pid, "type": "reading", "ts": ts, "source": "manual", "data": {"bg_mgdl": 110}, "created_at": ts})
    db.events.insert_many(docs)
    events = [make_event("reading", {"bg_mgdl": 100 + i}, minutes_ago=i) for i in range(3)]
    r = push(client, family["child"], *events)
    assert r["pet"]["streak_days"] == 3
    assert [x["dots"] for x in r["rewards"] if x["kind"] == "streak"] == [30]
    again = push(client, family["child"], make_event("reading", {"bg_mgdl": 99}))
    assert not [x for x in again["rewards"] if x["kind"] == "streak"]


# --- shop -----------------------------------------------------------------------------------


def test_buy_and_equip(client, family):
    pid, h = family["pid"], family["child"]["h"]
    assert client.post(f"/pet/{pid}/buy", json={"item_id": "hat_cap"}, headers=h).status_code == 402  # no dots
    db.pets.update_one({"_id": pid}, {"$set": {"dots": 120}})
    r = client.post(f"/pet/{pid}/buy", json={"item_id": "hat_cap"}, headers=h)
    assert r.status_code == 200 and r.json()["dots"] == 70 and "hat_cap" in r.json()["owned_items"]
    assert client.post(f"/pet/{pid}/buy", json={"item_id": "hat_cap"}, headers=h).status_code == 409
    r = client.post(f"/pet/{pid}/equip", json={"slot": "hat", "item_id": "hat_cap"}, headers=h)
    assert r.json()["equipped"]["hat"] == "hat_cap"
    assert client.post(f"/pet/{pid}/equip", json={"slot": "hat", "item_id": "hat_crown"}, headers=h).status_code == 403  # not owned
    assert client.post(f"/pet/{pid}/equip", json={"slot": "accessory", "item_id": "hat_cap"}, headers=h).status_code == 400  # wrong slot
    assert client.post(f"/pet/{pid}/equip", json={"slot": "hat", "item_id": None}, headers=h).json()["equipped"]["hat"] is None


def test_badge_locked_items_need_the_badge(client, family):
    pid, h = family["pid"], family["child"]["h"]
    db.pets.update_one({"_id": pid}, {"$set": {"dots": 999}})
    assert client.post(f"/pet/{pid}/buy", json={"item_id": "hat_wizard"}, headers=h).status_code == 403
    db.pets.update_one({"_id": pid}, {"$push": {"badges": "night_owl"}})
    assert client.post(f"/pet/{pid}/buy", json={"item_id": "hat_wizard"}, headers=h).status_code == 200


def test_high_five_gives_dots_and_notifies_child(client, family):
    pid = family["pid"]
    r = client.post(f"/pet/{pid}/high-five", headers=family["parent"]["h"])
    assert r.status_code == 200 and r.json()["dots"] == 5
    notes = client.get("/notifications", headers=family["child"]["h"]).json()
    assert notes["notifications"][0]["kind"] == "high_five"
    assert client.post(f"/pet/{pid}/high-five", headers=family["child"]["h"]).status_code == 403


# --- clinician loop -------------------------------------------------------------------------


def test_plan_update_bumps_version_and_notifies_parent(client, family):
    plan = {**PLAN, "icr": [{"start": "00:00", "g_per_unit": 8}]}
    r = client.put(f"/patients/{family['pid']}/plan", json=plan, headers=family["doc"]["h"])
    assert r.json()["version"] == 2
    inbox = client.get("/notifications", headers=family["parent"]["h"]).json()
    assert inbox["unread"] == 2  # v1 and v2
    assert "v2" in inbox["notifications"][0]["title"]


def test_note_notifies_parents_and_mark_read(client, family):
    client.post(f"/patients/{family['pid']}/notes", json={"text": "Great week!"}, headers=family["doc"]["h"])
    inbox = client.get("/notifications", headers=family["parent"]["h"]).json()
    note = inbox["notifications"][0]
    assert note["kind"] == "clinician_note" and note["body"] == "Great week!"
    client.post(f"/notifications/{note['id']}/read", headers=family["parent"]["h"])
    assert client.get("/notifications", headers=family["parent"]["h"]).json()["unread"] == inbox["unread"] - 1
    assert client.post(f"/patients/{family['pid']}/notes", json={"text": "x"}, headers=family["parent"]["h"]).status_code == 403


def test_dose_suggest_uses_plan_and_recent_activity(client, family):
    body = {"carbs_g": 45, "bg_mgdl": 140}
    plain = client.post("/dose/suggest", json=body, headers=family["parent"]["h"]).json()
    assert plain["suggested_units"] == 5.0 and plain["activity"] == "none"
    push(client, family["child"], make_event("activity", {"minutes": 30, "intensity": "moderate"}, minutes_ago=30))
    detected = client.post("/dose/suggest", json=body, headers=family["parent"]["h"]).json()
    assert detected["activity"] == "moderate" and detected["activity_detected"] and detected["suggested_units"] == 3.5
    forced = client.post("/dose/suggest", json={**body, "activity": "none"}, headers=family["parent"]["h"]).json()
    assert forced["suggested_units"] == 5.0


def test_dose_suggest_requires_a_plan(client):
    ptoken, _ = register(client, "Pat", "parent")
    code = client.get("/me", headers=auth(ptoken)).json()["family"]["code"]
    register(client, "Kid", "child", code)
    assert client.post("/dose/suggest", json={"carbs_g": 30, "bg_mgdl": 120}, headers=auth(ptoken)).status_code == 409


# --- alerts ---------------------------------------------------------------------------------


def _kinds(client, who):
    return [n["kind"] for n in client.get("/notifications", headers=who["h"]).json()["notifications"]]


def test_low_reading_alerts_parent_and_urgent_low_also_clinician(client, family):
    push(client, family["child"], make_event("reading", {"bg_mgdl": 62}))
    assert "out_of_range" in _kinds(client, family["parent"])
    assert "out_of_range" not in _kinds(client, family["doc"])
    push(client, family["child"], make_event("reading", {"bg_mgdl": 48}, minutes_ago=-0))
    assert "out_of_range" in _kinds(client, family["doc"])


def test_high_reading_alert_is_deduplicated_within_30_minutes(client, family):
    first = make_event("reading", {"bg_mgdl": 280}, minutes_ago=1)
    second = {**make_event("reading", {"bg_mgdl": 290}), "ts": first["ts"]}  # same instant -> same bucket
    push(client, family["child"], first, second)
    highs = [n for n in client.get("/notifications", headers=family["parent"]["h"]).json()["notifications"] if n["kind"] == "out_of_range"]
    assert len(highs) == 1


def test_stale_readings_do_not_alert(client, family):
    push(client, family["child"], make_event("reading", {"bg_mgdl": 300}, minutes_ago=6 * 60))
    assert "out_of_range" not in _kinds(client, family["parent"])


def test_missed_treatment_is_raised_once_after_the_window(client, family):
    tz = gamification.zone("America/New_York")
    today = datetime.now(timezone.utc).astimezone(tz).date()
    after_window = datetime.combine(today, datetime.min.time().replace(hour=13, minute=30), tzinfo=tz)  # lunch 12:00 ± 60
    alerts.run_checks(after_window)
    alerts.run_checks(after_window + timedelta(minutes=1))
    missed = [n for n in client.get("/notifications", headers=family["parent"]["h"]).json()["notifications"] if n["kind"] == "missed_treatment"]
    assert len(missed) == 1 and "lunch check" in missed[0]["title"]


def test_no_missed_alert_when_the_child_checked_in_time_or_window_open(client, family):
    tz = gamification.zone("America/New_York")
    today = datetime.now(timezone.utc).astimezone(tz).date()
    at = lambda h, m=0: datetime.combine(today, datetime.min.time().replace(hour=h, minute=m), tzinfo=tz)  # noqa: E731
    alerts.run_checks(at(12, 30))  # window still open
    assert "missed_treatment" not in _kinds(client, family["parent"])
    db.events.insert_one({"_id": "r1", "client_id": "r1-clientid", "patient_id": family["pid"], "type": "reading", "ts": at(12, 10), "source": "manual", "data": {"bg_mgdl": 120}, "created_at": at(12, 10)})
    alerts.run_checks(at(13, 30))
    assert "missed_treatment" not in _kinds(client, family["parent"])


def test_two_missed_checks_a_day_escalate_to_the_clinician(client, family):
    plan = {**PLAN, "reminders": [{"time": "08:00", "kind": "check", "window_min": 30}, {"time": "12:00", "kind": "check", "window_min": 30}]}
    client.put(f"/patients/{family['pid']}/plan", json=plan, headers=family["doc"]["h"])
    tz = gamification.zone("America/New_York")
    today = datetime.now(timezone.utc).astimezone(tz).date()
    for h, m in ((8, 45), (12, 45)):
        alerts.run_checks(datetime.combine(today, datetime.min.time().replace(hour=h, minute=m), tzinfo=tz))
    assert "out_of_range" in _kinds(client, family["doc"])


def test_simulator_endpoint_skip_lunch_and_access(client, family):
    r = client.post(f"/simulator/{family['pid']}", json={"scenario": "skip_lunch"}, headers=family["doc"]["h"])
    assert r.status_code == 200
    assert "missed_treatment" in _kinds(client, family["parent"])
    other, _ = register(client, "Other", "parent")
    assert client.post(f"/simulator/{family['pid']}", json={"scenario": "high"}, headers=auth(other)).status_code == 403


# --- glucose units --------------------------------------------------------------------------


def test_parent_sets_glucose_unit_and_child_device_receives_it(client, family):
    assert client.get("/me", headers=family["parent"]["h"]).json()["family"]["glucose_unit"] == "mg/dL"
    r = client.put("/families/settings", json={"glucose_unit": "mmol/L"}, headers=family["parent"]["h"])
    assert r.status_code == 200 and r.json()["glucose_unit"] == "mmol/L"
    assert client.get("/sync/pull", headers=family["child"]["h"]).json()["settings"] == {"glucose_unit": "mmol/L"}
    assert client.get("/patients", headers=family["doc"]["h"]).json()[0]["glucose_unit"] == "mmol/L"


def test_only_parents_change_units_and_values_are_validated(client, family):
    assert client.put("/families/settings", json={"glucose_unit": "mmol/L"}, headers=family["child"]["h"]).status_code == 403
    assert client.put("/families/settings", json={"glucose_unit": "mg"}, headers=family["parent"]["h"]).status_code == 422


def test_alerts_use_the_family_unit_but_storage_stays_mgdl(client, family):
    client.put("/families/settings", json={"glucose_unit": "mmol/L"}, headers=family["parent"]["h"])
    push(client, family["child"], make_event("reading", {"bg_mgdl": 63}))
    note = next(n for n in client.get("/notifications", headers=family["parent"]["h"]).json()["notifications"] if n["kind"] == "out_of_range")
    assert "3.5 mmol/L" in note["body"] and "mg/dL" not in note["body"]
    assert db.events.find_one({"patient_id": family["pid"]})["data"]["bg_mgdl"] == 63
