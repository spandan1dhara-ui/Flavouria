import asyncio, os, sys
sys.path.insert(0, "/app/backend")
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

env = dotenv_values("/app/backend/.env")
cli = AsyncIOMotorClient(env["MONGO_URL"])
db = cli[env["DB_NAME"]]

async def main():
    docs = await db.youtube_cache.find({}, {"_id": 0, "key": 1, "cached_at": 1, "videos.title": 1}).to_list(100)
    for d in docs:
        print(d["key"], d["cached_at"], [v["title"] for v in d.get("videos", [])])

asyncio.run(main())
