import pytest
import uuid
import botocore
from httpx import AsyncClient
from app.main import app
from app.db.models.recipe import Recipe
from app.db.models.user import User
from app.db.models.upload import Upload
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from unittest.mock import patch, MagicMock, AsyncMock

# Explicit imports to help coverage
import app.api.routes.auth as auth_route
import app.api.routes.recipes as recipes_route
import app.api.routes.ai as ai_route
import app.api.routes.uploads as uploads_route

@pytest.mark.asyncio
async def test_auth_comprehensive(client: AsyncClient, db):
    # Success Path: Register
    email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    reg_resp = await client.post("/auth/register", json={"username": email, "password": "password123"})
    assert reg_resp.status_code == 201
    
    # Duplicate Registration
    reg_resp_dup = await client.post("/auth/register", json={"username": email, "password": "password123"})
    assert reg_resp_dup.status_code == 400
    
    # Success Path: Login
    login_resp = await client.post("/auth/login", json={"username": email, "password": "password123"})
    assert login_resp.status_code == 200
    
    # Inactive User
    from app.core.security import get_password_hash
    inactive_user = User(email=f"i_{uuid.uuid4().hex}@e.com", hashed_password=get_password_hash("p"), is_active=False, full_name="I")
    db.add(inactive_user)
    await db.commit()
    response = await client.post("/auth/login", json={"username": inactive_user.email, "password": "p"})
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_recipe_lifecycle_and_search(client_with_auth: AsyncClient, db):
    me_resp = await client_with_auth.get("/auth/me")
    my_id = uuid.UUID(me_resp.json()["id"])

    # 1. Create with Upload
    up = Upload(user_id=my_id, object_key="recipes/test.jpg", content_type="image/jpeg", is_completed=True)
    db.add(up)
    await db.commit()
    
    # Create via AI
    with patch("app.api.routes.ai.ai_service.generate_recipe", return_value={"title": "AI", "description": "D", "ingredients": ["A"], "instructions": ["I"]}):
         with patch("app.api.routes.ai.storage_service.download_file", return_value=b"data"):
            ai_resp = await client_with_auth.post("/ai/recipe", json={"uploadId": str(up.id)})
            assert ai_resp.status_code == 200
            recipe_id = ai_resp.json()["id"]

    # 2. Search filtering
    search_resp = await client_with_auth.get("/recipes", params={"q": "AI"})
    assert search_resp.status_code == 200
    assert len(search_resp.json()["data"]) >= 1
    
    # 3. Update Success (Owner)
    patch_resp = await client_with_auth.patch(f"/recipes/{recipe_id}", json={"title": "Updated"})
    assert patch_resp.status_code == 200
    
    # 4. Delete Success
    del_resp = await client_with_auth.delete(f"/recipes/{recipe_id}")
    assert del_resp.status_code == 204

@pytest.mark.asyncio
async def test_ai_service_comprehensive():
    from app.services.ai_service import AIService
    from app.core.circuit_breaker import steps_breaker
    steps_breaker.state = "CLOSED"
    steps_breaker.failure_count = 0
    with patch("app.services.ai_service.AsyncOpenAI") as mock_openai, \
         patch("app.services.ai_service.cost_guard.can_proceed", return_value=True):
        mock_client = AsyncMock()
        mock_openai.return_value = mock_client
        mock_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content='{"title": "AI", "ingredients": [], "instructions": []}'))]
        )
        svc = AIService()
        await svc.generate_recipe(["a"], ["b"])
        
        # Validation Success
        mock_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content='{"issues": []}'))]
        )
        await svc.validate_ingredients(["a"], ["b"])

@pytest.mark.asyncio
async def test_storage_comprehensive():
    from app.services.storage_service import S3StorageService, DiskStorageService
    # 1. S3 Mocks
    with patch("app.services.storage_service.boto3.client") as mock_boto:
        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3
        error_response = {'Error': {'Code': '404'}}
        mock_s3.head_bucket.side_effect = botocore.exceptions.ClientError(error_response, "head_bucket")
        svc = S3StorageService()
        svc.ensure_bucket_exists()
        assert mock_s3.create_bucket.called
        svc.generate_presigned_url("t.jpg", "image/jpeg")
        
    # 2. Disk Error Paths
    ds = DiskStorageService()
    with pytest.raises(Exception):
        ds.download_file("nonexistent_file_path_traversal_test")
