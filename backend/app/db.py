from typing import Optional
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
from app.services.search_service import BKTree

logger = logging.getLogger(__name__)

class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    bktree: BKTree = BKTree()

db_manager = DatabaseManager()


async def get_database() -> AsyncIOMotorDatabase:
    if db_manager.db is None:
        raise RuntimeError("Database not initialized")
    return db_manager.db


async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    db_manager.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_manager.db = db_manager.client[settings.DATABASE_NAME]

    # Create Indexes
    try:
        users_col = db_manager.db["users"]
        await users_col.create_index("username", unique=True)
        await users_col.create_index("email", unique=True)

        images_col = db_manager.db["image_registry"]
        await images_col.create_index("level_0_phash")
        await images_col.create_index("owner_id")
        await images_col.create_index("created_at")

        # Warm up BK-Tree index
        cursor = images_col.find({}, {"_id": 1, "level_0_phash": 1, "owner_username": 1, "filename": 1})
        count = 0
        async for doc in cursor:
            db_manager.bktree.insert(
                item_id=str(doc["_id"]),
                phash=doc.get("level_0_phash", ""),
                metadata={
                    "owner_username": doc.get("owner_username", ""),
                    "filename": doc.get("filename", "")
                }
            )
            count += 1
        logger.info(f"Connected to MongoDB. Warmed up BK-Tree with {count} images.")
    except Exception as e:
        logger.warning(f"Note during DB index initialization: {e}")


async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db_manager.client:
        db_manager.client.close()
        logger.info("MongoDB connection closed.")
