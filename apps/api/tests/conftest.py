import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.api.deps import get_db

# Use in-memory SQLite for speed/isolation in unit tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback() # Clean up data after test
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def db(db_session: AsyncSession):
    """Shorthand for db_session"""
    yield db_session

@pytest_asyncio.fixture(scope="function")
async def client(db: AsyncSession):
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    
    app.dependency_overrides.clear()

@pytest_asyncio.fixture(scope="function")
async def client_with_auth(client: AsyncClient):
    """Returns an authenticated client for testing protected routes"""
    # 1. Register
    await client.post("/auth/register", json={
        "username": "auth_user@example.com",
        "password": "testpassword"
    })
    # 2. Login (to set session cookie)
    await client.post("/auth/login", json={
        "username": "auth_user@example.com",
        "password": "testpassword"
    })
    return client
