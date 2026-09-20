"""A child can tap a button twenty times. None of it should buy hats or reach the doctor's chart."""

from app import db
from app.services import gamification

from .conftest import make_event, push


def flagged(pid: str) -> list[dict]:
    return list(db.events.find({"patient_id": pid, "suspect": True}))


def test_spamming_the_same_check_up_pays_once(client, family):
    same = [make_event("reading", {"bg_mgdl": 120}) for _ in range(6)]
    r = push(client, family["child"], *same)

    assert r["new_count"] == 6  # nothing is thrown away...
    assert r["pet"]["dots"] == gamification.DOTS_READING  # ...and exactly one of them paid
    marked = flagged(family["pid"])
    assert len(marked) == 5 and all("duplicate" in e["flags"] for e in marked)


def test_different_values_typed_seconds_apart_are_still_spam(client, family):
    r = push(client, family["child"], *[make_event("reading", {"bg_mgdl": 100 + i}) for i in range(4)])
    assert r["pet"]["dots"] == gamification.DOTS_READING
    assert [e["flags"] for e in flagged(family["pid"])] == [["too_fast"]] * 3


def test_a_days_worth_of_meals_has_a_limit(client, family):
    """Ten different meals in one evening, half an hour apart: believable one at a time, not as a day."""
    foods = ["apple", "pizza", "rice", "milk", "cookie", "bread", "pear", "juice", "burger", "fries"]
    meals = [make_event("meal", {"items": [{"id": f}]}, minutes_ago=30 * i) for i, f in enumerate(foods)]
    push(client, family["child"], *meals)
    marked = flagged(family["pid"])
    assert len(marked) == 2 and all(e["flags"] == ["daily_limit"] for e in marked)  # the day's 9th and 10th


def test_flagged_logs_are_kept_out_of_the_medical_picture(client, family):
    push(client, family["child"], *[make_event("reading", {"bg_mgdl": 300}) for _ in range(4)])

    summary = client.get("/patients", headers=family["doc"]["h"]).json()[0]
    assert summary["readings_count"] == 1  # the doctor sees the check-up, not the four taps
    events = client.get(f"/patients/{family['pid']}/events", headers=family["doc"]["h"]).json()
    assert len(events) == 1
    all_of_them = client.get(f"/patients/{family['pid']}/events", params={"flagged": "true"}, headers=family["doc"]["h"]).json()
    assert len(all_of_them) == 4  # still there when someone goes looking


def test_the_parent_is_told_so_a_real_mistake_can_be_fixed(client, family):
    push(client, family["child"], *[make_event("reading", {"bg_mgdl": 120}) for _ in range(3)])
    inbox = client.get("/notifications", headers=family["parent"]["h"]).json()["notifications"]
    checks = [n for n in inbox if n["kind"] == "data_check"]
    assert len(checks) == 1 and "weren't counted" in checks[0]["body"]


def test_a_child_is_never_shown_what_tripped_the_check(client, family):
    push(client, family["child"], *[make_event("reading", {"bg_mgdl": 120}) for _ in range(3)])
    events = client.get("/sync/pull", headers=family["child"]["h"]).json()["events"]
    assert len(events) == 3 and not any("flags" in e or "suspect" in e for e in events)


def test_what_a_parent_logs_is_trusted(client, family):
    r = push(client, family["parent"], *[make_event("reading", {"bg_mgdl": 120}) for _ in range(3)])
    assert r["new_count"] == 3 and flagged(family["pid"]) == []


def test_a_spammed_reading_cannot_finish_the_doctors_task(client, family):
    """The first check-up in the window is the one that counts; the copies change nothing."""
    from .conftest import add_task

    add_task(client, family, time=None, kind="check", title="Check when you can")
    push(client, family["child"], *[make_event("reading", {"bg_mgdl": 120}) for _ in range(5)])
    plan = client.get("/sync/pull", headers=family["child"]["h"]).json()["pet"]["quests"]["plan"]
    assert [q["done"] for q in plan] == [True]
    dots = gamification.get_pet(family["pid"])["dots"]
    assert dots == gamification.DOTS_READING + 25 + gamification.DOTS_PLAN_BONUS  # one check-up + the task + its bonus


def test_a_check_up_and_a_meal_together_are_fine(client, family):
    """Two different things at once is how care actually happens — only the tap-everything spree is spam."""
    r = push(
        client,
        family["child"],
        make_event("reading", {"bg_mgdl": 130}),
        make_event("meal", {"items": [{"id": "pasta"}]}),
    )
    assert r["new_count"] == 2 and flagged(family["pid"]) == []
    assert r["pet"]["dots"] == gamification.DOTS_READING + gamification.DOTS_MEAL


def test_dinner_in_one_sitting_still_counts(client, family):
    """Check-up, then the meal, then the medicine, a couple of minutes apart: three real things."""
    r = push(
        client,
        family["child"],
        make_event("reading", {"bg_mgdl": 130}, minutes_ago=4),
        make_event("meal", {"items": [{"id": "pasta"}]}, minutes_ago=2),
        make_event("bolus", {}),
    )
    assert flagged(family["pid"]) == [] and r["new_count"] == 3


def test_tapping_through_every_button_at_once_does_not(client, family):
    push(
        client,
        family["child"],
        make_event("reading", {"bg_mgdl": 130}),
        make_event("meal", {"items": [{"id": "pasta"}]}),
        make_event("activity", {"minutes": 30, "intensity": "moderate"}),
        make_event("bolus", {}),
    )
    marked = flagged(family["pid"])
    assert len(marked) == 2 and all("burst" in e["flags"] for e in marked)  # the first two still count


# --- the care team's own judgement ------------------------------------------------------------


def test_a_clinician_can_set_aside_a_reading_they_dont_believe(client, family):
    push(client, family["child"], make_event("reading", {"bg_mgdl": 500}, minutes_ago=30))
    push(client, family["child"], make_event("reading", {"bg_mgdl": 120}))
    pid = family["pid"]
    wrong = db.events.find_one({"patient_id": pid, "data.bg_mgdl": 500})

    r = client.post(f"/patients/{pid}/events/{wrong['_id']}/discard", headers=family["doc"]["h"])
    assert r.status_code == 200 and r.json()["flags"] == ["discarded"]

    summary = client.get("/patients", headers=family["doc"]["h"]).json()[0]
    assert summary["readings_count"] == 1 and summary["avg_mgdl"] == 120  # the 500 is out of the numbers
    assert len(client.get(f"/patients/{pid}/events", headers=family["doc"]["h"]).json()) == 1
    shown = client.get(f"/patients/{pid}/events", params={"flagged": "true"}, headers=family["doc"]["h"]).json()
    assert [e["flags"] for e in shown if e["id"] == wrong["_id"]] == [["discarded"]]  # still there, and labelled

    client.post(f"/patients/{pid}/events/{wrong['_id']}/restore", headers=family["doc"]["h"])
    assert client.get("/patients", headers=family["doc"]["h"]).json()[0]["readings_count"] == 2


def test_a_parent_can_set_one_aside_too_and_a_child_cannot(client, family):
    push(client, family["child"], make_event("meal", {"items": [{"id": "cookie"}]}))
    pid = family["pid"]
    meal = db.events.find_one({"patient_id": pid, "type": "meal"})
    assert client.post(f"/patients/{pid}/events/{meal['_id']}/discard", headers=family["child"]["h"]).status_code == 403
    assert client.post(f"/patients/{pid}/events/{meal['_id']}/discard", headers=family["parent"]["h"]).status_code == 200
    assert client.post(f"/patients/{pid}/events/nope/discard", headers=family["parent"]["h"]).status_code == 404


def test_restoring_overrules_the_spam_check(client, family):
    """A child really did check twice in a minute: the doctor says so, and it counts again."""
    push(client, family["child"], *[make_event("reading", {"bg_mgdl": 60 + 10 * i}) for i in range(2)])
    pid = family["pid"]
    spam = db.events.find_one({"patient_id": pid, "suspect": True})
    client.post(f"/patients/{pid}/events/{spam['_id']}/restore", headers=family["doc"]["h"])
    assert db.events.find_one({"_id": spam["_id"]}).get("suspect") is None
    assert client.get("/patients", headers=family["doc"]["h"]).json()[0]["readings_count"] == 2
