import os
os.environ["TESTING"] = "True"

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

@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Provides a fresh database session and engine for each test."""
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"
    engine = create_async_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    async with TestingSessionLocal() as session:
        # Override the dependency
        app.dependency_overrides[get_db] = lambda: session
        
        # Mock storage initialization to avoid network calls
        from unittest.mock import patch
        with patch("app.services.storage_service.storage_service.initialize"):
            yield session
            
        await session.rollback()
        app.dependency_overrides.clear()
        
    await engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def client(db: AsyncSession):
    """Provides an AsyncClient."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest_asyncio.fixture(scope="function")
async def client_with_auth(client: AsyncClient):
    """Returns an authenticated client."""
    import uuid
    email = f"auth_fixture_{uuid.uuid4().hex[:8]}@example.com"
    await client.post("/auth/register", json={
        "username": email,
        "password": "testpassword"
    })
    await client.post("/auth/login", json={
        "username": email,
        "password": "testpassword"
    })
    return client
