import pytest
import uuid
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException, Response, Request
from app.db.models.user import User
from app.db.models.recipe import Recipe
from app.db.models.upload import Upload
from app.api.routes.ai import generate_recipe_route, validate_ingredients_route, RecipeGenerationRequest, IngredientValidationRequest
from app.api.routes.auth import register, login, logout, read_users_me, update_user_me, UserProfileUpdate, LoginRequest, to_user_response
from app.api.routes.health import health_check
from app.api.routes.recipes import read_recipe, update_recipe, delete_recipe, to_recipe_response
from app.api.routes.uploads import create_presigned_url, direct_upload, get_content, complete_upload, PresignRequest, CompleteRequest

@pytest.mark.asyncio
async def test_ai_generate_recipe_upload_not_found():
    db = AsyncMock()
    # Mock result.scalars().first() -> None
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    db.execute.return_value = mock_result
    
    current_user = User(id=uuid.uuid4())
    payload = RecipeGenerationRequest(uploadId=uuid.uuid4())
    with pytest.raises(HTTPException) as exc:
        await generate_recipe_route(payload, current_user, db)
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_ai_generate_recipe_storage_error():
    db = AsyncMock()
    upload = Upload(id=uuid.uuid4(), user_id=uuid.uuid4(), object_key="test.jpg")
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = upload
    db.execute.return_value = mock_result
    
    current_user = User(id=upload.user_id)
    payload = RecipeGenerationRequest(uploadId=upload.id)
    with patch("app.api.routes.ai.storage_service.download_file", side_effect=Exception("Storage error")):
        with pytest.raises(HTTPException) as exc:
            await generate_recipe_route(payload, current_user, db)
    assert exc.value.status_code == 500

@pytest.mark.asyncio
async def test_ai_generate_recipe_missing_inputs():
    current_user = User(id=uuid.uuid4())
    payload = RecipeGenerationRequest(ingredients=[], restrictions=[])
    with pytest.raises(HTTPException) as exc:
        await generate_recipe_route(payload, current_user, AsyncMock())
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_ai_generate_recipe_limit_exceeded():
    db = AsyncMock()
    current_user = User(id=uuid.uuid4())
    payload = RecipeGenerationRequest(ingredients=["apple"])
    with patch("app.api.routes.ai.ai_service.generate_recipe", side_effect=Exception("limit exceeded")):
        with pytest.raises(HTTPException) as exc:
            await generate_recipe_route(payload, current_user, db)
    assert exc.value.status_code == 429

@pytest.mark.asyncio
async def test_ai_generate_recipe_service_unavailable():
    db = AsyncMock()
    current_user = User(id=uuid.uuid4())
    payload = RecipeGenerationRequest(ingredients=["apple"])
    with patch("app.api.routes.ai.ai_service.generate_recipe", side_effect=Exception("Service unavailable")):
        with pytest.raises(HTTPException) as exc:
            await generate_recipe_route(payload, current_user, db)
    assert exc.value.status_code == 503

@pytest.mark.asyncio
async def test_ai_validate_ingredients_error():
    current_user = User(id=uuid.uuid4())
    payload = IngredientValidationRequest(ingredients=["apple"], restrictions=[])
    with patch("app.api.routes.ai.ai_service.validate_ingredients", side_effect=Exception("AI error")):
        with pytest.raises(HTTPException) as exc:
            await validate_ingredients_route(payload, current_user)
    assert exc.value.status_code == 500

@pytest.mark.asyncio
async def test_auth_update_me_profile_image_not_found():
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    db.execute.return_value = mock_result
    
    current_user = User(id=uuid.uuid4(), email="u@e.com", full_name="U", role="user")
    payload = UserProfileUpdate(profileImageId=uuid.uuid4())
    with pytest.raises(HTTPException) as exc:
        await update_user_me(payload, db, current_user)
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_health_check_storage_down():
    db = AsyncMock()
    db.execute.return_value = MagicMock()
    with patch("app.api.routes.health.settings.STORAGE_BACKEND", "disk"):
        with patch("os.path.exists", return_value=False):
            resp = await health_check(db)
            assert resp["checks"]["storage"] == "down"
            assert resp["status"] == "degraded"

@pytest.mark.asyncio
async def test_recipes_read_not_found():
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    db.execute.return_value = mock_result
    with pytest.raises(HTTPException) as exc:
        await read_recipe(uuid.uuid4(), db)
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_uploads_direct_upload_not_disk():
    with patch("app.api.routes.uploads.settings.STORAGE_BACKEND", "s3"):
        request = MagicMock(spec=Request)
        with pytest.raises(HTTPException) as exc:
            await direct_upload("test.jpg", request)
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_uploads_get_content_not_disk():
    with patch("app.api.routes.uploads.settings.STORAGE_BACKEND", "s3"):
        with pytest.raises(HTTPException) as exc:
            await get_content("test.jpg")
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_uploads_complete_not_found():
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    db.execute.return_value = mock_result
    
    current_user = User(id=uuid.uuid4())
    payload = CompleteRequest(uploadId=uuid.uuid4())
    with pytest.raises(HTTPException) as exc:
        await complete_upload(payload, current_user, db)
    assert exc.value.status_code == 404
