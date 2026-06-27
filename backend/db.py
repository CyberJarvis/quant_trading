import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGO_AVAILABLE = False

users_collection = None
portfolios_collection = None
imported_holdings_collection = None
cache_collection = None
candles_collection = None
signals_collection = None

if MONGODB_URI:
    try:
        from pymongo import MongoClient, ASCENDING
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        db = client.get_database("pravah")

        users_collection             = db["users"]
        portfolios_collection        = db["portfolios"]
        imported_holdings_collection = db["imported_holdings"]
        cache_collection             = db["cache"]
        candles_collection           = db["candles"]
        signals_collection           = db["signals"]

        # TTL indexes — MongoDB auto-deletes expired documents
        cache_collection.create_index(   [("expires_at", ASCENDING)], expireAfterSeconds=0)
        candles_collection.create_index( [("expires_at", ASCENDING)], expireAfterSeconds=0)
        signals_collection.create_index( [("expires_at", ASCENDING)], expireAfterSeconds=0)

        MONGO_AVAILABLE = True
        print("MongoDB connected ✓")
    except Exception as e:
        print(f"MongoDB connection failed (in-memory fallback): {e}")
