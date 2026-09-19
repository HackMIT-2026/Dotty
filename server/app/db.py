from pymongo import MongoClient
from pymongo.database import Database

from .config import settings

# The only place a MongoDB client is created. The client connects lazily.
_client = MongoClient(settings.mongodb_uri)


def get_db() -> Database:
    return _client[settings.mongodb_db]
