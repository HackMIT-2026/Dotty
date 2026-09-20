"""The doctor's care plan: tasks, privacy split, completion rewards, mood, alerts and adherence."""

from datetime import datetime, timezone

import pytest

from app import db
from app.services import alerts, gamification

from .conftest import add_task, auth, make_event, push, register

TZ = gamification.zone("America/New_York")


def local_now() -> datetime:
    return datetime.now(timezone.utc).astimezone(TZ)


def at_today(h: int, m: int = 0) -> datetime:
    return datetime.combine(local_now().date(), datetime.min.time().replace(hour=h, minute=m), tzinfo=TZ)


def hhmm_now() -> str:
    return local_now().strftime("%H:%M")


def kinds(client, who) -> list[dict]:
    return client.get("/notifications", headers=who["h"]).json()["notifications"]


# --- the plan itself -------------------------------------------------------------------------


def test_clinician_creates_task_and_parents_are_told(client, family):
    t = add_task(client, family, title="Bedtime basal insulin", kind="medicine", time="21:00",
                 instructions="12 u Lantus", importance=3)
    # the clinician writes no game content: the child's wording and Dots come from kind, time and priority
    assert t["quest_title"] == "Bedtime medicine with Dotty" and t["reward_dots"] == 40
    note = kinds(client, family["parent"])[0]
    assert note["title"] == "Care plan updated" and "Bedtime basal insulin (21:00)" in note["body"]


def test_child_wording_and_dots_follow_the_clinical_fields(client, family):
    morning = add_task(client, family, title="Morning check", kind="check", time="07:30", importance=1)
    assert (morning["quest_title"], morning["reward_dots"]) == ("Morning check-up with Dotty", 15)
    anytime = add_task(client, family, title="Move every day", kind="activity", time=None, target_minutes=20, importance=2)
    assert (anytime["quest_title"], anytime["reward_dots"]) == ("Play time with Dotty", 25)
    # anything the clinician tries to send for the game side is ignored
    sneaky = add_task(client, family, title="Evening check", time="18:00", quest_title="hacked", reward_dots=999)
    assert sneaky["quest_title"] == "Dinner check-up with Dotty" and sneaky["reward_dots"] == 25
    moved = client.put(
        f"/patients/{family['pid']}/tasks/{morning['id']}",
        json={"title": "Morning check", "kind": "check", "time": "21:00", "importance": 3},
        headers=family["doc"]["h"],
    ).json()
    assert (moved["quest_title"], moved["reward_dots"]) == ("Bedtime check-up with Dotty", 40)


def test_only_clinicians_edit_the_plan(client, family):
    body = {"title": "x", "kind": "check"}
    for who in ("parent", "child"):
        assert client.post(f"/patients/{family['pid']}/tasks", json=body, headers=family[who]["h"]).status_code == 403
    p2, _ = register(client, "P2", "parent")
    other, _ = register(client, "OtherDoc", "clinician", client.get("/me", headers=auth(p2)).json()["family"]["code"])
    assert client.post(f"/patients/{family['pid']}/tasks", json=body, headers=auth(other)).status_code == 403  # not their patient


def test_child_never_receives_medical_wording(client, family):
    add_task(client, family, title="Bedtime basal insulin", instructions="12 u Lantus", kind="medicine", time="21:00")
    child_tasks = client.get(f"/patients/{family['pid']}/tasks", headers=family["child"]["h"]).json()
    child_pull = client.get("/sync/pull", headers=family["child"]["h"]).json()
    for payload in (child_tasks, child_pull["tasks"], child_pull["pet"]["quests"]["plan"]):
        assert "Lantus" not in str(payload) and "basal" not in str(payload).lower()
        assert all("instructions" not in t and "title" not in t for t in payload)
    assert child_pull["tasks"][0]["quest_title"] == "Bedtime medicine with Dotty"
    parent_pull = client.get("/sync/pull", headers=family["parent"]["h"]).json()
    assert parent_pull["tasks"][0]["instructions"] == "12 u Lantus"


def test_task_events_need_a_task_id(client, family):
    r = client.post("/sync/push", json={"events": [make_event("task", {"date": "2026-01-01"})]}, headers=family["child"]["h"])
    assert r.status_code == 422


def test_archived_tasks_disappear_and_parents_are_told(client, family):
    t = add_task(client, family)
    assert client.delete(f"/patients/{family['pid']}/tasks/{t['id']}", headers=family["doc"]["h"]).status_code == 200
    assert client.get(f"/patients/{family['pid']}/tasks", headers=family["parent"]["h"]).json() == []
    assert "removed" in kinds(client, family["parent"])[0]["body"]


# --- completion and rewards --------------------------------------------------------------------


def test_check_task_pays_its_reward_once_plus_the_whole_plan_bonus(client, family):
    task = add_task(client, family, time=hhmm_now(), importance=3)
    first = push(client, family["child"], make_event("reading", {"bg_mgdl": 120}))
    labels = {(r["label"], r["dots"]) for r in first["rewards"]}
    assert (task["quest_title"], 40) in labels and ("All big quests done!", 50) in labels
    assert first["pet"]["dots"] == 10 + 40 + 50
    again = push(client, family["child"], make_event("reading", {"bg_mgdl": 118}))
    assert not {"task", "quests"} & {r["kind"] for r in again["rewards"]}  # no second task reward or plan bonus


def test_each_task_kind_is_completed_by_the_right_event(client, family):
    med = add_task(client, family, title="Insulin", kind="medicine", time=hhmm_now())
    custom = add_task(client, family, title="Rotate the sensor", kind="custom", time=None)
    play = add_task(client, family, title="Exercise", kind="activity", time=None, target_minutes=20)
    push(
        client,
        family["child"],
        make_event("bolus", {}),
        make_event("task", {"task_id": custom["id"], "date": local_now().date().isoformat()}),
        make_event("activity", {"minutes": 25, "intensity": "moderate"}),
    )
    grid = client.get(f"/patients/{family['pid']}/adherence?days=1", headers=family["doc"]["h"]).json()
    status = {row["task"]["id"]: row["cells"][-1] for row in grid["rows"]}
    assert status == {med["id"]: "done", custom["id"]: "done", play["id"]: "done"}
    assert grid["rate_pct"] == 100


def test_finished_quests_move_to_the_bottom_of_the_child_list(client, family):
    now = local_now()
    if now.hour * 60 + now.minute > 22 * 60 + 58:
        # a task at 23:59 is inside the +/-60 minute window of a reading logged after 22:59, so it would count as done
        pytest.skip("no later time left today that stays outside the reading's window")
    add_task(client, family, title="Now", time=hhmm_now())
    add_task(client, family, title="Later", time="23:59")
    push(client, family["child"], make_event("reading", {"bg_mgdl": 120}))
    plan = client.get(f"/pet/{family['pid']}", headers=family["child"]["h"]).json()["quests"]["plan"]
    assert [q["status"] for q in plan] == ["upcoming", "done"]  # still to do first, finished last


def test_quests_split_into_doctor_plan_and_good_habits(client, family):
    add_task(client, family, time="23:59" if local_now().hour < 22 else "23:58")
    quests = client.get(f"/pet/{family['pid']}", headers=family["child"]["h"]).json()["quests"]
    assert [q["status"] for q in quests["plan"]] == ["upcoming"]
    assert quests["plan"][0]["when"] == "at bedtime"
    assert [h["id"] for h in quests["habits"]] == ["lunch", "play"]  # generic check-up quest replaced by the doctor's


def test_without_a_plan_the_generic_check_up_quest_comes_back(client, family):
    quests = client.get(f"/pet/{family['pid']}", headers=family["child"]["h"]).json()["quests"]
    assert quests["plan"] == [] and [h["id"] for h in quests["habits"]] == ["checks", "lunch", "play"]


# --- missed tasks ------------------------------------------------------------------------------


def test_missed_task_alerts_parent_once_and_dotty_waits(client, family):
    add_task(client, family, title="Morning glucose check", time="08:00", window_min=30, instructions="Fingerstick.")
    alerts.run_checks(at_today(8, 45))
    alerts.run_checks(at_today(8, 46))
    missed = [n for n in kinds(client, family["parent"]) if n["kind"] == "missed_treatment"]
    assert len(missed) == 1 and missed[0]["title"] == "Maya missed Morning glucose check (08:00)"
    assert "Fingerstick." in missed[0]["body"]

    # the child cannot act on a lapsed quest, so it disappears from their list; Dotty just looks for the next one
    pet = gamification.pet_view(gamification.get_pet(family["pid"]), "America/New_York", at=at_today(8, 45))
    assert pet["quests"]["plan"] == [] and "missed" not in str(pet["quests"])
    assert pet["mood"] == "waiting" and "missed" not in pet["mood_message"]  # nothing that blames the child


def test_no_missed_alert_while_window_open_or_when_done(client, family):
    add_task(client, family, time="12:00", window_min=60)
    alerts.run_checks(at_today(12, 30))
    assert not [n for n in kinds(client, family["parent"]) if n["kind"] == "missed_treatment"]
    ts = at_today(12, 10)
    db.events.insert_one({"_id": "r1", "client_id": "r1-client", "patient_id": family["pid"], "type": "reading", "ts": ts,
                          "source": "manual", "data": {"bg_mgdl": 120}, "created_at": ts})
    alerts.run_checks(at_today(13, 30))
    assert not [n for n in kinds(client, family["parent"]) if n["kind"] == "missed_treatment"]


def test_two_missed_tasks_escalate_to_the_clinician(client, family):
    add_task(client, family, title="Morning check", time="08:00", window_min=30)
    add_task(client, family, title="Lunch check", time="12:00", window_min=30)
    alerts.run_checks(at_today(8, 45))
    alerts.run_checks(at_today(12, 45))
    doc_alerts = [n["title"] for n in kinds(client, family["doc"])]
    assert "Maya missed 2 care-plan tasks today" in doc_alerts


def test_daily_summary_after_the_last_task_window(client, family):
    add_task(client, family, title="Morning check", time="08:00", window_min=30)
    add_task(client, family, title="Lunch check", time="12:00", window_min=30)
    ts = at_today(8, 10)
    db.events.insert_one({"_id": "r1", "client_id": "r1-client", "patient_id": family["pid"], "type": "reading", "ts": ts,
                          "source": "manual", "data": {"bg_mgdl": 110}, "created_at": ts})
    alerts.run_checks(at_today(12, 45))
    alerts.run_checks(at_today(12, 50))
    summaries = [n for n in kinds(client, family["parent"]) if n["kind"] == "care_summary"]
    assert len(summaries) == 1
    assert summaries[0]["title"] == "Maya's care plan today: 1 of 2 done" and "Lunch check" in summaries[0]["body"]


# --- portal views ------------------------------------------------------------------------------


def test_adherence_and_patient_summary_for_the_portal(client, family):
    add_task(client, family)
    assert client.get(f"/patients/{family['pid']}/adherence", headers=family["child"]["h"]).status_code == 403
    grid = client.get(f"/patients/{family['pid']}/adherence?days=7", headers=family["parent"]["h"]).json()
    assert len(grid["days"]) == 7 and grid["rows"][0]["cells"][:6] == [None] * 6  # task didn't exist before today
    summary = client.get("/patients", headers=family["doc"]["h"]).json()[0]
    assert summary["tasks_count"] == 1 and "adherence_pct" in summary


def test_clinician_joins_another_family_with_its_code(client, family):
    p2, _ = register(client, "Sam", "parent")
    code2 = client.get("/me", headers=auth(p2)).json()["family"]["code"]
    register(client, "Leo", "child", code2)
    r = client.post("/clinician/join", json={"family_code": code2}, headers=family["doc"]["h"])
    assert r.status_code == 200 and r.json()["clinician"]["name"] == "DrLee"
    assert {p["name"] for p in client.get("/patients", headers=family["doc"]["h"]).json()} == {"Maya", "Leo"}
    assert client.post("/clinician/join", json={"family_code": "ZZZZZZ"}, headers=family["doc"]["h"]).status_code == 404
    p3, _ = register(client, "Ana", "parent")
    other, _ = register(client, "OtherDoc", "clinician", client.get("/me", headers=auth(p3)).json()["family"]["code"])
    assert client.post("/clinician/join", json={"family_code": family["code"]}, headers=auth(other)).status_code == 409
