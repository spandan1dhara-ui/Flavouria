import asyncio, sys
sys.path.insert(0, "/app/backend")
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values
from youtube_agent import _is_compilation

env = dotenv_values("/app/backend/.env")
db = AsyncIOMotorClient(env["MONGO_URL"])[env["DB_NAME"]]

async def main():
    docs = await db.youtube_cache.find({}, {"_id": 0, "key": 1, "cached_at": 1, "videos.title": 1}).to_list(500)
    bad = 0
    for d in docs:
        for v in d.get("videos", []):
            if _is_compilation(v["title"]):
                bad += 1
                print("STALE COMPILATION:", d["key"], "|", d["cached_at"], "|", v["title"])
    print(f"total cache docs={len(docs)} offending videos={bad}")

asyncio.run(main())
