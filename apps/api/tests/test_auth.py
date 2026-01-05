import pytest
from httpx import AsyncClient
from app.db.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient, db: AsyncSession):
    # 1. Register with unique email
    import uuid
    email = f"auth_test_{uuid.uuid4().hex[:8]}@example.com"
    reg_data = {"username": email, "password": "password123"}
    response = await client.post("/auth/register", json=reg_data)
    assert response.status_code == 201
    assert response.json()["email"] == email

    # 2. Login
    login_response = await client.post("/auth/login", json=reg_data)
    assert login_response.status_code == 200
    assert "session_id" in login_response.cookies
    assert login_response.json()["email"] == email

@pytest.mark.asyncio
async def test_profile_update(client_with_auth: AsyncClient, db: AsyncSession):
    # Update profile
    update_data = {
        "full_name": "Updated Name",
        "bio": "New bio",
        "dietaryPreferences": ["Vegan", "Gluten-Free"]
    }
    response = await client_with_auth.patch("/auth/me", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["bio"] == "New bio"
    assert "Vegan" in data["dietaryPreferences"]
    assert "role" in data
    assert data["role"] == "user" # Default role

@pytest.mark.asyncio
async def test_logout(client_with_auth: AsyncClient):
    response = await client_with_auth.post("/auth/logout")
    assert response.status_code == 200
    # Cookie should be cleared
    assert "session_id" not in response.cookies or response.cookies["session_id"] == ""
