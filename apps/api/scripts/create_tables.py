import asyncio
from app.db.base import Base
from app.db.session import engine

# Import models to ensure they are registered
from app.db.models.user import User
from app.db.models.upload import Upload
from app.db.models.recipe import Recipe

async def create_tables():
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(create_tables())
