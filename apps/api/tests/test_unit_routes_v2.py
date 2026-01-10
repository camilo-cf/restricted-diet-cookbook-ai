import pytest
import uuid
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch
from app.api.routes.auth import login, register
from app.api.routes.recipes import create_recipe, update_recipe, delete_recipe
from app.api.routes.uploads import create_presigned_url, PresignRequest
from app.db.models.user import User
from app.db.models.recipe import Recipe
from fastapi import HTTPException, Response

@pytest.mark.asyncio
async def test_unit_login_not_found():
    db = AsyncMock()
    db.execute.return_value = MagicMock(scalars=lambda: MagicMock(first=lambda: None))
    with pytest.raises(HTTPException) as exc:
        await login(Response(), MagicMock(username="x", password="y"), db)
    assert exc.value.status_code == 401

@pytest.mark.asyncio
async def test_unit_register_existing():
    db = AsyncMock()
    db.execute.return_value = MagicMock(scalars=lambda: MagicMock(first=lambda: User(email="x")))
    with pytest.raises(HTTPException) as exc:
        await register(MagicMock(username="x", password="y"), db)
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_unit_update_recipe_forbidden():
    db = AsyncMock()
    recipe = Recipe(id=uuid.uuid4(), user_id=uuid.uuid4(), title="R", description="", ingredients=[], instructions=[], created_at=datetime.utcnow())
    db.execute.return_value = MagicMock(scalars=lambda: MagicMock(first=lambda: recipe))
    current_user = User(id=uuid.uuid4(), role="user")
    with pytest.raises(HTTPException) as exc:
        await update_recipe(recipe.id, {}, db, current_user)
    assert exc.value.status_code == 403

@pytest.mark.asyncio
async def test_unit_delete_recipe_nonexistent():
    db = AsyncMock()
    db.execute.return_value = MagicMock(scalars=lambda: MagicMock(first=lambda: None))
    with pytest.raises(HTTPException) as exc:
        await delete_recipe(uuid.uuid4(), db, User(id=uuid.uuid4(), role="admin"))
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_unit_presign_invalid():
    payload_large = PresignRequest(filename="test.jpg", contentType="image/jpeg", sizeBytes=99999999, category="recipes")
    with pytest.raises(HTTPException) as exc:
        await create_presigned_url(payload_large, User(id=uuid.uuid4()), AsyncMock())
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_unit_login_success():
    from app.api.routes.auth import login
    db = AsyncMock()
    user = User(
        id=uuid.uuid4(), 
        email="test@e.com", 
        hashed_password="hashed_password", 
        is_active=True,
        full_name="Test User",
        role="user"
    )
    db.execute.return_value = MagicMock(scalars=lambda: MagicMock(first=lambda: user))
    with patch("app.api.routes.auth.verify_password", return_value=True):
        with patch("app.api.routes.auth.create_session_token", return_value="token"):
            resp = await login(Response(), MagicMock(username="test@e.com", password="p"), db)
            assert resp.email == "test@e.com"

@pytest.mark.asyncio
async def test_unit_update_recipe_with_upload():
    from app.api.routes.recipes import update_recipe
    from app.db.models.upload import Upload
    db = AsyncMock()
    recipe = Recipe(id=uuid.uuid4(), user_id=uuid.uuid4(), title="R", description="", ingredients=[], instructions=[], created_at=datetime.utcnow())
    
    from app.db.models.upload import Upload
    mock_upload = Upload(id=uuid.uuid4(), user_id=recipe.user_id)
    
    db.execute.side_effect = [
        MagicMock(scalars=lambda: MagicMock(first=lambda: recipe)),
        MagicMock(scalars=lambda: MagicMock(first=lambda: mock_upload)),
        MagicMock(scalars=lambda: MagicMock(first=lambda: recipe))
    ]
    current_user = User(id=recipe.user_id, role="user")
    resp = await update_recipe(recipe.id, {"title": "New", "uploadId": str(uuid.uuid4())}, db, current_user)
    assert resp.title == "New"

@pytest.mark.asyncio
async def test_storage_disk_serve_nonexistent():
    from app.services.storage_service import DiskStorageService
    ds = DiskStorageService()
    with pytest.raises(Exception):
        ds.download_file("nonexistent")

@pytest.mark.asyncio
async def test_health_check_unit():
    from app.api.routes.health import health_check
    db = AsyncMock()
    db.execute.return_value = MagicMock()
    resp = await health_check(db)
    assert resp["status"] == "ok"
