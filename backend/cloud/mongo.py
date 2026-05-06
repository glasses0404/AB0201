import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "autobidder")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI is missing. Add it to .env or Koyeb environment variables.")

mongo_client = AsyncIOMotorClient(MONGODB_URI)
mongo_db = mongo_client[MONGODB_DB_NAME]


async def ping_mongo():
    await mongo_client.admin.command("ping")
    return True