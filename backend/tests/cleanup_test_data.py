import asyncio, sys
sys.path.insert(0, "/app/backend")
from database import db

async def main():
    r = await db.recipes.delete_many({"title": {"$regex": "^(TEST |QA )"}})
    print("recipes deleted:", r.deleted_count)
    creators = await db.creators.find({"display_name": {"$regex": "^TEST "}}, {"_id": 0, "id": 1}).to_list(100)
    cids = [c["id"] for c in creators]
    r2 = await db.recipes.delete_many({"creator_id": {"$in": cids}})
    r3 = await db.creators.delete_many({"id": {"$in": cids}})
    r4 = await db.users.delete_many({"email": {"$regex": "flavouriaqa\\.com$"}})
    print("orphan recipes:", r2.deleted_count, "creators:", r3.deleted_count, "users:", r4.deleted_count)
    print("remaining creators:", await db.creators.count_documents({}))
    print("remaining recipes:", await db.recipes.count_documents({}))
    print("pending:", await db.recipes.count_documents({"status": "PENDING"}))

asyncio.run(main())
