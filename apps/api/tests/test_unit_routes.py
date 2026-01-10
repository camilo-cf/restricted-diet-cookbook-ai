import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.api.deps_auth import get_current_user
from app.api.deps import get_db
from unittest.mock import MagicMock, patch, AsyncMock
from uuid import uuid4

@pytest.fixture
def mock_user():
    return MagicMock(id=uuid4(), email="unit-test@example.com")

@pytest.mark.asyncio
async def test_health_check_unit(client: AsyncClient, db: AsyncSession):
    with patch("app.api.routes.health.boto3.client") as mock_boto:
        mock_boto.return_value = MagicMock()
        response = await client.get("/health")
        assert response.status_code == 200

@pytest.mark.asyncio
async def test_ai_generate_unit(client_with_auth: AsyncClient, db: AsyncSession):
    with patch("app.api.routes.ai.ai_service.generate_recipe", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"title": "AI Recipe", "description": "D", "ingredients": [], "instructions": [], "dietary_tags": [], "prep_time_minutes": 10, "cook_time_minutes": 10}
        response = await client_with_auth.post("/ai/recipe", json={"ingredients": ["apple"]})
        assert response.status_code == 200

@pytest.mark.asyncio
async def test_uploads_presign_unit(client_with_auth: AsyncClient, db: AsyncSession):
    # Mock storage and ensure we return a valid dict that matches the schema
    with patch("app.api.routes.uploads.storage_service.generate_presigned_url") as mock_presign:
        mock_presign.return_value = "http://fake"
        response = await client_with_auth.post("/uploads/presign", json={"filename": "a.jpg", "contentType": "image/jpeg", "sizeBytes": 10})
        assert response.status_code == 200

@pytest.mark.asyncio
async def test_recipes_list_unit(client: AsyncClient, db: AsyncSession):
    # This now uses the real integration db but we keep it here for coverage
    response = await client.get("/recipes")
    assert response.status_code == 200
