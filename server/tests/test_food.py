"""The food box: the child types words, the grown-ups get the grams."""

from app import db
from app.services import food

from .conftest import make_event, push


def test_the_table_answers_when_claude_is_not_configured():
    est = food.estimate("mac and cheese")
    assert est["carbs_g"] == 40 and est["source"] == "table" and not est["needs_parent"]
    assert food.estimate("MAC & CHEESE!")["label"] == est["label"]  # same food, cached


def test_a_food_nobody_recognises_waits_for_a_grown_up():
    est = food.estimate("wobblefruit surprise")
    assert est["carbs_g"] == 0 and est["source"] == "unknown" and est["needs_parent"]


def test_the_child_is_never_told_the_grams(client, family):
    r = client.post("/food/estimate", json={"text": "pizza"}, headers=family["child"]["h"])
    assert r.status_code == 200 and r.json() == {"label": "Pizza slice", "needs_parent": False, "known": True}

    parent = client.post("/food/estimate", json={"text": "pizza"}, headers=family["parent"]["h"]).json()
    assert parent["carbs_g"] == 30


def test_the_server_counts_the_meal_the_child_logged(client, family):
    push(client, family["child"], make_event("meal", {"items": [{"id": "pizza", "n": 2}, {"text": "apple juice"}]}))
    stored = db.events.find_one({"patient_id": family["pid"], "type": "meal"})
    assert stored["data"]["carbs_g"] == 30 * 2 + 25
    assert stored["data"]["carbs_source"] == "estimated"

    child_feed = client.get("/sync/pull", headers=family["child"]["h"]).json()["events"]
    assert "carbs_g" not in child_feed[0]["data"]
    assert all("carbs" not in i for i in child_feed[0]["data"]["items"])
    parent_feed = client.get("/sync/pull", headers=family["parent"]["h"]).json()["events"]
    assert parent_feed[0]["data"]["carbs_g"] == 85


def test_the_help_button_puts_the_meal_in_the_parents_inbox(client, family):
    """"Ask a grown-up" on the Eat screen: the meal is logged, and the parent is the one who counts it."""
    push(client, family["child"], make_event("meal", {"items": [{"id": "pizza"}], "help": True}))
    meal = db.events.find_one({"patient_id": family["pid"], "type": "meal"})
    assert meal["data"]["needs_parent"] and meal["data"]["carbs_g"] == 30  # the estimate is there to start from

    inbox = client.get("/notifications", headers=family["parent"]["h"]).json()["notifications"]
    assert any(n["kind"] == "food_help" and n["data"]["asked"] for n in inbox)


def test_a_meal_nobody_could_count_goes_to_the_parent(client, family):
    push(client, family["child"], make_event("meal", {"items": [{"text": "grandmas special stew"}]}))
    meal = db.events.find_one({"patient_id": family["pid"], "type": "meal"})
    assert meal["data"]["needs_parent"]

    inbox = client.get("/notifications", headers=family["parent"]["h"]).json()["notifications"]
    ask = next(n for n in inbox if n["kind"] == "food_help")
    assert ask["data"]["event_id"] == meal["_id"]
    assert client.get("/food/pending", headers=family["parent"]["h"]).json()[0]["id"] == meal["_id"]

    r = client.post(f"/meals/{meal['_id']}/carbs", json={"carbs_g": 55}, headers=family["parent"]["h"])
    assert r.status_code == 200 and r.json()["data"]["carbs_g"] == 55
    assert r.json()["data"]["carbs_source"] == "parent" and not r.json()["data"]["needs_parent"]
    assert client.get("/food/pending", headers=family["parent"]["h"]).json() == []

    thanks = client.get("/notifications", headers=family["child"]["h"]).json()["notifications"]
    assert thanks[0]["kind"] == "help_answered" and "55" not in thanks[0]["body"]


def test_a_child_cannot_set_their_own_carbs(client, family):
    push(client, family["child"], make_event("meal", {"items": [{"id": "cookie"}]}))
    meal = db.events.find_one({"patient_id": family["pid"], "type": "meal"})
    assert client.post(f"/meals/{meal['_id']}/carbs", json={"carbs_g": 5}, headers=family["child"]["h"]).status_code == 403
