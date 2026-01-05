import asyncio
from sqlalchemy import text
from app.db.session import engine

async def add_role_column():
    print("Adding role column to users table...")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'"))
            print("Column added successfully.")
        except Exception as e:
            print(f"Error adding column: {e}")
            print("Attempting to ignore if already exists...")

if __name__ == "__main__":
    asyncio.run(add_role_column())
