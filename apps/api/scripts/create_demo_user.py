import asyncio
from app.db.session import async_session_maker
from app.db.models.user import User
from app.core.security import get_password_hash

async def create_demo_user():
    async with async_session_maker() as db:
        try:
            # Check if exists
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.email == "demo@example.com"))
            existing = result.scalars().first()
            
            if existing:
                print("Demo user already exists.")
                return

            demo_user = User(
                email="demo@example.com",
                hashed_password=get_password_hash("password"),
                full_name="Demo Chef",
                is_active=True
            )
            db.add(demo_user)
            await db.commit()
            print("Successfully created demo user (demo@example.com / password)")
        except Exception as e:
            print(f"Error creating user: {e}")

if __name__ == "__main__":
    asyncio.run(create_demo_user())
