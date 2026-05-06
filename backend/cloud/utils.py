from datetime import datetime, timezone
from bson import ObjectId


def now_utc():
    return datetime.now(timezone.utc)


def object_id_to_str(doc: dict | None):
    if not doc:
        return None

    doc = dict(doc)

    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]

    return doc


def object_ids_to_str(docs: list[dict]):
    return [object_id_to_str(doc) for doc in docs]


def to_object_id(value: str):
    return ObjectId(value)