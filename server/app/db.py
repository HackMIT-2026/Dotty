import os

from pymongo import ASCENDING, DESCENDING, MongoClient

client = MongoClient(
    os.getenv("MONGO_URI", "mongodb://localhost:27017"),
    tz_aware=True,
    serverSelectionTimeoutMS=5000,
)
db = client[os.getenv("MONGO_DB", "dotty")]

users = db.users
families = db.families
plans = db.treatment_plans
events = db.events
pets = db.pets
shop_items = db.shop_items
notes = db.notes
notifications = db.notifications
tasks = db.tasks
food_cache = db.food_cache

COLLECTIONS = [
    "users", "families", "treatment_plans", "events", "pets", "shop_items", "notes", "notifications", "tasks", "food_cache",
]

# Event filters. `suspect` events are the ones services/integrity.py flagged as spammed: they stay in the log,
# but they never earn Dots and never reach a chart, a total or a care-plan task.
CHECKED = {"suspect": {"$ne": True}}
TRUSTED = {"source": {"$ne": "simulator"}, **CHECKED}


def ensure_indexes() -> None:
    users.create_index("email", unique=True, partialFilterExpression={"email": {"$type": "string"}})  # children have none
    families.create_index("code", unique=True)
    plans.create_index("patient_id", unique=True)
    events.create_index([("patient_id", ASCENDING), ("ts", ASCENDING)])
    events.create_index([("patient_id", ASCENDING), ("created_at", ASCENDING)])
    events.create_index("client_id", unique=True)
    food_cache.create_index("created_at")
    notifications.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    tasks.create_index([("patient_id", ASCENDING), ("active", ASCENDING)])
    notifications.create_index(
        [("user_id", ASCENDING), ("dedupe", ASCENDING)],
        unique=True,
        partialFilterExpression={"dedupe": {"$type": "string"}},
    )
