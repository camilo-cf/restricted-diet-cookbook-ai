import asyncio
from app.db.base import Base
from app.db.session import engine

# Import models to ensure they are registered
from app.db.models.user import User
from app.db.models.upload import Upload
from app.db.models.recipe import Recipe

async def reset_db():
    print("Dropping tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset successfully.")

if __name__ == "__main__":
    asyncio.run(reset_db())
