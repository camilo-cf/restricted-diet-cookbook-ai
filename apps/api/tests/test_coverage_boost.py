import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.recipe import Recipe

@pytest.mark.asyncio
async def test_health_detailed(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "checks" in data

@pytest.mark.asyncio
async def test_recipe_search(client: AsyncClient, db: AsyncSession):
    # Search for non-existent
    response = await client.get("/recipes?q=nonexistent_recipe_xyz")
    assert response.status_code == 200
    assert len(response.json()["data"]) == 0

@pytest.mark.asyncio
async def test_recipe_pagination(client: AsyncClient):
    response = await client.get("/recipes?skip=0&limit=1")
    assert response.status_code == 200
    assert "hasMore" in response.json()

@pytest.mark.asyncio
async def test_upload_fallback_routes(client_with_auth: AsyncClient):
    # Test direct upload endpoint (fallback)
    obj_key = f"test-{uuid.uuid4()}.txt"
    content = b"fake image content"
    response = await client_with_auth.put(f"/uploads/direct-upload/{obj_key}", content=content)
    assert response.status_code == 200
    
    # Test content serving endpoint
    response = await client_with_auth.get(f"/uploads/content/{obj_key}")
    assert response.status_code == 200
    assert response.content == content

@pytest.mark.asyncio
async def test_recipe_not_found(client: AsyncClient):
    bad_id = uuid.uuid4()
    response = await client.get(f"/recipes/{bad_id}")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_recipe_update_full(client_with_auth: AsyncClient, db: AsyncSession):
    # Create
    recipe_data = {
        "title": "Update Me",
        "ingredients": ["A"],
        "instruction_text": "Do it.",
        "dietary_tags": ["tag1"]
    }
    res = await client_with_auth.post("/recipes", json=recipe_data)
    rid = res.json()["id"]
    
    # Update with camelCase
    update_data = {
        "title": "Updated",
        "description": "New Desc",
        "prepTimeMinutes": 15,
        "cookTimeMinutes": 20,
        "dietaryTags": ["tag2"]
    }
    res_upd = await client_with_auth.patch(f"/recipes/{rid}", json=update_data)
    assert res_upd.status_code == 200
    assert res_upd.json()["title"] == "Updated"
    assert res_upd.json()["dietaryTags"] == ["tag2"]
    assert res_upd.json()["prepTimeMinutes"] == 15
    assert res_upd.json()["cookTimeMinutes"] == 20

@pytest.mark.asyncio
async def test_auth_me_profile(client_with_auth: AsyncClient):
    response = await client_with_auth.get("/auth/me")
    assert response.status_code == 200
    assert "email" in response.json()

@pytest.mark.asyncio
async def test_upload_complete_flow(client_with_auth: AsyncClient):
    # 1. Presign
    res = await client_with_auth.post("/uploads/presign", json={
        "filename": "me.jpg",
        "contentType": "image/jpeg",
        "sizeBytes": 100
    })
    assert res.status_code == 200
    uid = res.json()["uploadId"]
    upload_url = res.json()["uploadUrl"]
    # Path is /uploads/direct-upload/...
    path = upload_url.split("http://localhost:8000")[-1]
    
    # 2. Direct Upload (needs valid JPEG headers for magic byte check)
    # Valid JPEG start: FF D8 FF E0
    jpeg_content = b"\xff\xd8\xff\xe0" + b"0" * 96
    await client_with_auth.put(path, content=jpeg_content)
    
    # 3. Complete
    res_comp = await client_with_auth.post("/uploads/complete", json={"uploadId": str(uid)})
    assert res_comp.status_code == 204

@pytest.mark.asyncio
async def test_health_storage_disk(client: AsyncClient):
    # Verify health check hits the disk storage check
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["checks"]["storage"] == "ok"

@pytest.mark.asyncio
async def test_logging_middleware(client: AsyncClient):
    # Simply hit an endpoint and check if it survives (coverage only)
    response = await client.get("/health")
    assert response.status_code == 200
    assert "X-Request-Id" in response.headers
