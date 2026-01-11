import pytest
import uuid
import json
import os
import botocore.exceptions
from tenacity import RetryError
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException, Response, Request
from app.api.routes.auth import register, login, logout, read_users_me, update_user_me, UserProfileUpdate, LoginRequest, to_user_response
from app.api.routes.health import health_check
from app.api.routes.recipes import get_recipes, update_recipe, delete_recipe, read_recipe
from app.api.routes.uploads import direct_upload, complete_upload, CompleteRequest, create_presigned_url, PresignRequest
from app.db.models.user import User
from app.db.models.recipe import Recipe
from app.db.models.upload import Upload
from app.services.storage_service import S3StorageService, DiskStorageService
from app.main import lifespan

@pytest.mark.asyncio
async def test_auth_profile_url_public_aws():
    # Lines 49-50
    user = User(id=uuid.uuid4(), email="u@e.com", full_name="U", role="user", is_active=True)
    upload = Upload(object_key="profiles/me.jpg")
    user.profile_image = upload
    with patch("app.api.routes.auth.settings") as mock_settings:
        mock_settings.PUBLIC_API_URL = "http://api.com"
        resp = to_user_response(user)
        assert "http://api.com/uploads/content/profiles/me.jpg" == resp.profileImageUrl

@pytest.mark.asyncio
async def test_auth_dietary_prefs_invalid_json():
    # Lines 56-57
    user = User(id=uuid.uuid4(), email="u@e.com", full_name="U", role="user", dietary_preferences="invalid-json", is_active=True)
    resp = to_user_response(user)
    assert resp.dietaryPreferences == []

@pytest.mark.asyncio
async def test_auth_login_password_mismatch():
    # Lines 114-115
    db = AsyncMock()
    user = User(id=uuid.uuid4(), email="u@e.com", hashed_password="hashed_password", is_active=True)
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = user
    db.execute.return_value = mock_result
    
    with patch("app.api.routes.auth.verify_password", return_value=False):
        with pytest.raises(HTTPException) as exc:
            await login(Response(), LoginRequest(username="u@e.com", password="wrong"), db)
        assert exc.value.status_code == 401

@pytest.mark.asyncio
async def test_auth_login_inactive_user():
    # Line 118
    db = AsyncMock()
    user = User(id=uuid.uuid4(), email="u@e.com", hashed_password="hashed_password", is_active=False)
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = user
    db.execute.return_value = mock_result
    
    with patch("app.api.routes.auth.verify_password", return_value=True):
        with pytest.raises(HTTPException) as exc:
            await login(Response(), LoginRequest(username="u@e.com", password="p"), db)
        assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_health_check_s3_success():
    # Lines 41-43
    db = AsyncMock()
    db.execute.return_value = MagicMock()
    with patch("app.api.routes.health.settings.STORAGE_BACKEND", "s3"):
        # Health check uses boto3.client("s3") directly
        with patch("app.api.routes.health.boto3.client") as mock_boto:
            mock_s3 = MagicMock()
            mock_boto.return_value = mock_s3
            mock_s3.head_bucket.return_value = {}
            resp = await health_check(db)
            assert resp["checks"]["storage"] == "ok"

@pytest.mark.asyncio
async def test_health_check_s3_failure():
    # Lines 46-53
    db = AsyncMock()
    db.execute.return_value = MagicMock()
    with patch("app.api.routes.health.settings.STORAGE_BACKEND", "s3"):
        with patch("app.api.routes.health.boto3.client") as mock_boto:
            mock_s3 = MagicMock()
            mock_boto.return_value = mock_s3
            mock_s3.head_bucket.side_effect = Exception("S3 Down")
            resp = await health_check(db)
            assert resp["checks"]["storage"] == "down"
            assert resp["status"] == "degraded"

@pytest.mark.asyncio
async def test_recipes_search_params():
    # Lines 246-256
    db = AsyncMock()
    # Mock search result
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    db.execute.return_value = mock_result
    
    await get_recipes(db, dietary_tags="vegan,gf", q="apple")
    assert db.execute.called

@pytest.mark.asyncio
async def test_uploads_direct_upload_success():
    # Lines 65-71
    with patch("app.api.routes.uploads.settings.STORAGE_BACKEND", "disk"):
        with patch("app.api.routes.uploads.settings.UPLOAD_DIR", "/tmp"):
            request = MagicMock(spec=Request)
            request.body = AsyncMock(return_value=b"data")
            
            with patch("builtins.open", MagicMock()):
                resp = await direct_upload("test.jpg", request)
                assert resp.status_code == 200

@pytest.mark.asyncio
async def test_uploads_complete_upload_success():
    # Lines 111-121
    db = AsyncMock()
    current_user = User(id=uuid.uuid4())
    upload = Upload(id=uuid.uuid4(), user_id=current_user.id, object_key="test.jpg")
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = upload
    db.execute.return_value = mock_result
    
    with patch("app.api.routes.uploads.storage_service.verify_upload", return_value=True):
        resp = await complete_upload(CompleteRequest(uploadId=upload.id), current_user, db)
        assert resp.status_code == 204

def test_storage_s3_initialize_success():
    # Lines 54-61
    svc = S3StorageService()
    svc._initialized = False
    with patch.object(svc, "ensure_bucket_exists", return_value=None):
        with patch.object(svc, "ensure_bucket_cors", return_value=None):
            svc.initialize()
            assert svc._initialized == True

def test_storage_s3_cors_success():
    # Lines 86-95
    svc = S3StorageService()
    svc.s3_client = MagicMock()
    svc.ensure_bucket_cors()
    assert svc.s3_client.put_bucket_cors.called

def test_storage_disk_verify_mime_invalid():
    # Line 161 (disk)
    svc = DiskStorageService()
    with patch("os.path.exists", return_value=True):
        with patch("os.path.getsize", return_value=100):
            with patch("builtins.open", MagicMock()):
                with patch("app.services.storage_service.magic.from_buffer", return_value="text/plain"):
                    with pytest.raises(ValueError) as exc:
                        svc.verify_upload("test.txt")
                    assert "Invalid mime" in str(exc.value)

@pytest.mark.asyncio
async def test_auth_register_success_path():
    # Lines 83-96
    db = AsyncMock()
    # First call to check email, second call to reload user
    u = User(id=uuid.uuid4(), email="new@e.com", full_name="new", role="user", is_active=True)
    
    mock_res1 = MagicMock()
    mock_res1.scalars.return_value.first.return_value = None
    mock_res2 = MagicMock()
    mock_res2.scalars.return_value.first.return_value = u
    
    db.execute.side_effect = [mock_res1, mock_res2]
    
    with patch("app.api.routes.auth.get_password_hash", return_value="hashed"):
        resp = await register(LoginRequest(username="new@e.com", password="p"), db)
        assert resp.email == "new@e.com"

@pytest.mark.asyncio
async def test_auth_update_me_image_success():
    # Lines 183-191
    db = AsyncMock()
    current_user = User(id=uuid.uuid4(), email="u@e.com", full_name="U", role="user", is_active=True)
    upload = Upload(id=uuid.uuid4(), user_id=current_user.id)
    
    mock_res1 = MagicMock()
    mock_res1.scalars.return_value.first.return_value = upload
    mock_res2 = MagicMock()
    mock_res2.scalars.return_value.first.return_value = current_user
    
    db.execute.side_effect = [mock_res1, mock_res2]
    
    payload = UserProfileUpdate(profileImageId=upload.id)
    resp = await update_user_me(payload, db, current_user)
    assert resp.email == "u@e.com"

@pytest.mark.asyncio
async def test_delete_recipe_permission_demo():
    # Lines 246-258 for demo
    db = AsyncMock()
    recipe = Recipe(id=uuid.uuid4(), user_id=uuid.uuid4())
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = recipe
    db.execute.return_value = mock_result
    
    demo_user = User(id=uuid.uuid4(), email="demo@example.com", role="user")
    resp = await delete_recipe(recipe.id, db, demo_user)
    assert resp.status_code == 204

@pytest.mark.asyncio
async def test_delete_recipe_permission_staff():
    # Lines 246-258 for staff
    db = AsyncMock()
    recipe = Recipe(id=uuid.uuid4(), user_id=uuid.uuid4())
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = recipe
    db.execute.return_value = mock_result
    
    staff_user = User(id=uuid.uuid4(), email="staff@e.com", role="maintainer")
    resp = await delete_recipe(recipe.id, db, staff_user)
    assert resp.status_code == 204

@pytest.mark.asyncio
async def test_read_users_me_success():
    # Lines 159-160 (auth)
    db = AsyncMock()
    current_user = User(id=uuid.uuid4(), email="u@e.com", full_name="U", role="user", is_active=True)
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = current_user
    db.execute.return_value = mock_result
    resp = await read_users_me(db, current_user)
    assert resp.email == "u@e.com"

@pytest.mark.asyncio
async def test_health_check_ai_failure():
    # Lines 59-60 (health)
    db = AsyncMock()
    db.execute.return_value = MagicMock()
    with patch("app.api.routes.health.settings") as mock_settings:
        mock_settings.STORAGE_BACKEND = "disk"
        mock_settings.UPLOAD_DIR = "/tmp"
        mock_settings.OPENAI_API_KEY = "invalid"
        with patch("os.path.exists", return_value=True):
            with patch("os.access", return_value=True):
                 resp = await health_check(db)
                 assert resp["checks"]["ai"] == "fail"

@pytest.mark.asyncio
async def test_update_recipe_not_found():
    # Line 140 (recipes)
    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    db.execute.return_value = mock_result
    current_user = User(id=uuid.uuid4())
    with pytest.raises(HTTPException) as exc:
        await update_recipe(uuid.uuid4(), {}, db, current_user)
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_create_presigned_url_invalid_mime():
    # Line 42 (uploads)
    current_user = User(id=uuid.uuid4())
    payload = PresignRequest(filename="f.txt", contentType="text/plain", sizeBytes=100)
    with pytest.raises(HTTPException) as exc:
        await create_presigned_url(payload, current_user, AsyncMock())
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_storage_s3_verify_upload_404():
    # lines 110-124 (storage)
    svc = S3StorageService()
    svc.s3_client = MagicMock()
    error_response = {'Error': {'Code': '404', 'Message': 'Not Found'}}
    svc.s3_client.head_object.side_effect = botocore.exceptions.ClientError(error_response, "head_object")
    # Due to @retry, it raises RetryError wrapping the ValueError
    with pytest.raises(RetryError):
        svc.verify_upload("missing.jpg")

@pytest.mark.asyncio
async def test_storage_s3_download_error():
    # Lines 137-138 (storage)
    svc = S3StorageService()
    svc.s3_client = MagicMock()
    svc.s3_client.get_object.side_effect = Exception("S3 Error")
    with patch.object(svc, "s3_client", svc.s3_client): # Ensure it uses the mock
        with pytest.raises(Exception) as exc:
            svc.download_file("f.jpg")
        assert "S3 Error" in str(exc.value)

def test_storage_disk_download_not_found():
    # Line 167 (storage disk)
    svc = DiskStorageService()
    with patch("os.path.exists", return_value=False):
        with pytest.raises(FileNotFoundError):
            svc.download_file("f.jpg")

@pytest.mark.asyncio
async def test_lifespan_sqlite():
    # Lines 15->23 (main)
    app = MagicMock()
    with patch("app.main.settings") as mock_settings:
        mock_settings.DATABASE_URL = "sqlite+aiosqlite:///test.db"
        # Database check will still run after skipping table creation
        with patch("app.db.session.AsyncSessionLocal") as mock_session:
            mock_db = AsyncMock()
            mock_session.return_value.__aenter__.return_value = mock_db
            
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = MagicMock()
            mock_db.execute.return_value = mock_result
            
            with patch("app.services.storage_service.storage_service.initialize"):
                async with lifespan(app):
                    pass
            assert mock_db.execute.called
