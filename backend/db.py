import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGO_AVAILABLE = False
users_collection = None
portfolios_collection = None
imported_holdings_collection = None

if MONGODB_URI:
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        db = client.get_database("pravah")
        users_collection = db["users"]
        portfolios_collection = db["portfolios"]
        imported_holdings_collection = db["imported_holdings"]
        MONGO_AVAILABLE = True
        print("MongoDB connected successfully")
    except Exception as e:
        print(f"MongoDB connection failed (demo mode active): {e}")
