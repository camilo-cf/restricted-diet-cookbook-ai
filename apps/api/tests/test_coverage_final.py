import pytest
import uuid
import os
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import patch, MagicMock
from app.api.deps import get_db
from app.main import app

@pytest.mark.asyncio
async def test_health_failures(client: AsyncClient):
    with patch("app.api.routes.health.text") as mock_text:
        mock_text.side_effect = Exception("DB DEAD")
        response = await client.get("/health")
        assert response.json()["checks"]["db"] == "down"

    with patch("os.access", return_value=False):
        response = await client.get("/health")
        assert response.json()["checks"]["storage"] == "down"

@pytest.mark.asyncio
async def test_auth_errors_deep(client: AsyncClient, db: AsyncSession):
    from app.db.models.user import User
    from app.core.security import create_session_token
    from sqlalchemy import update
    
    email = f"inactive_{uuid.uuid4().hex[:4]}@example.com"
    u_id = uuid.uuid4()
    user = User(id=u_id, email=email, hashed_password="x", full_name="Inactive User", is_active=False)
    db.add(user)
    await db.commit()
    
    token = create_session_token({"sub": str(u_id)})
    client.cookies.set("session_id", token)
    
    res = await client.get("/auth/me")
    assert res.status_code == 400

    from jose import jwt
    from app.core.config import settings
    token_no_sub = jwt.encode({"not-sub": "x"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    client.cookies.set("session_id", token_no_sub)
    res = await client.get("/auth/me")
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_real_get_db(db: AsyncSession):
    from app.api.deps import get_db
    gen = get_db()
    session = await gen.__anext__()
    assert session is not None
    await gen.aclose()

@pytest.mark.asyncio
async def test_recipe_roles_more(client: AsyncClient, db: AsyncSession):
    email1 = f"u1_{uuid.uuid4().hex[:4]}@example.com"
    await client.post("/auth/register", json={"username": email1, "password": "p"})
    await client.post("/auth/login", json={"username": email1, "password": "p"})
    res = await client.post("/recipes", json={"title": "T", "ingredients": [], "instruction_text": "I", "dietary_tags": []})
    rid = res.json()["id"]
    
    # 2. Update all fields
    res_upd = await client.patch(f"/recipes/{rid}", json={
        "title": "T2",
        "description": "D",
        "prepTimeMinutes": 10,
        "cookTimeMinutes": 10,
        "dietaryTags": ["V"],
        "ingredients": ["apple"]
    })
    assert res_upd.status_code == 200

    # 3. Maintainer delete
    from app.db.models.user import User
    from sqlalchemy import update
    await db.execute(update(User).where(User.email == email1).values(role="maintainer"))
    await db.commit()
    
    res_del_staff = await client.delete(f"/recipes/{rid}")
    assert res_del_staff.status_code == 204

@pytest.mark.asyncio
async def test_ai_errors(client_with_auth: AsyncClient):
    # Hit error paths in AI route
    with patch("app.api.routes.ai.ai_service.generate_recipe", side_effect=Exception("AI FAIL")):
        res = await client_with_auth.post("/ai/recipe", json={"ingredients": ["apple"]})
        assert res.status_code == 500

@pytest.mark.asyncio
async def test_root_route(client: AsyncClient):
    res = await client.get("/")
    assert res.status_code == 200

@pytest.mark.asyncio
async def test_auth_user_not_found(client: AsyncClient):
    # Valid token structure but random UUID not in DB
    from app.core.security import create_session_token
    token = create_session_token({"sub": str(uuid.uuid4())})
    client.cookies.set("session_id", token)
    res = await client.get("/auth/me")
    assert res.status_code == 401
