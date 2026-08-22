import asyncio, sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

env = dotenv_values("/app/backend/.env")
db = AsyncIOMotorClient(env["MONGO_URL"])[env["DB_NAME"]]

async def main():
    keys = sys.argv[1:]
    r = await db.youtube_cache.delete_many({"key": {"$in": keys}})
    print("deleted", r.deleted_count)

asyncio.run(main())
