import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.user_sessions.create_index("session_token")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.creators.create_index("slug", unique=True)
    await db.creators.create_index("user_id")
    await db.recipes.create_index("slug", unique=True)
    await db.recipes.create_index("status")
    await db.recipes.create_index("cuisine")
    await db.recipes.create_index("category")
    await db.recipes.create_index("creator_id")
    await db.recipes.create_index([("title", "text"), ("description", "text"), ("tags", "text")])
    await db.ratings.create_index([("recipe_id", 1), ("user_id", 1)], unique=True)
    await db.saved_recipes.create_index([("user_id", 1), ("recipe_id", 1)], unique=True)
    await db.youtube_saved.create_index([("user_id", 1), ("video_id", 1)], unique=True)
    await db.search_events.create_index("created_at")
    await db.ai_recipes.create_index("key", unique=True)
    await db.ai_recipes.create_index("id", unique=True)
    await db.shopping_lists.create_index([("user_id", 1), ("created_at", -1)])
