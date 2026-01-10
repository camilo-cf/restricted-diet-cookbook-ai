import os
os.environ["TESTING"] = "True"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["OPENAI_API_KEY"] = "sk-test-mock-key"
os.environ["STORAGE_BACKEND"] = "disk"
os.environ["UPLOAD_DIR"] = "/tmp/cookbook-tests"

import pytest
import pytest_asyncio
import shutil
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.api.deps import get_db

@pytest_asyncio.fixture(scope="session", autouse=True)
def setup_teardown():
    # Setup upload dir
    os.makedirs(os.environ["UPLOAD_DIR"], exist_ok=True)
    yield
    # Teardown
    if os.path.exists(os.environ["UPLOAD_DIR"]):
        shutil.rmtree(os.environ["UPLOAD_DIR"])

@pytest_asyncio.fixture(scope="session")
async def engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def db(engine) -> AsyncGenerator[AsyncSession, None]:
    TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture(autouse=True)
async def override_dependencies(db):
    async def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()

@pytest_asyncio.fixture(scope="function")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as c:
        yield c

@pytest_asyncio.fixture(scope="function")
async def client_with_auth(client: AsyncClient):
    import uuid
    email = f"auth_fixture_{uuid.uuid4().hex[:8]}@example.com"
    await client.post("/auth/register", json={
        "username": email,
        "password": "testpassword"
    })
    login_response = await client.post("/auth/login", json={
        "username": email,
        "password": "testpassword"
    })
    # Extract session_id cookie and add it to the client
    session_id = login_response.cookies.get("session_id")
    if session_id:
        client.cookies.set("session_id", session_id)
    return client
