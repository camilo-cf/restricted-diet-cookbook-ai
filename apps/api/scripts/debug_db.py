import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.core.config import settings

async def debug_db():
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    async with AsyncSessionLocal() as db:
        try:
            # Check connection matches
            result = await db.execute(text("SELECT current_database(), current_schema()"))
            row = result.fetchone()
            print(f"Connected to DB: {row[0]}, Schema: {row[1]}")

            # List tables
            result = await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = result.fetchall()
            print("Tables in public schema:")
            for t in tables:
                print(f" - {t[0]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_db())
