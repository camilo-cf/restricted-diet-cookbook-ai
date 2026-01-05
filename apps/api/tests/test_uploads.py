import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import MagicMock, patch

@pytest.mark.asyncio
async def test_upload_flow(client: AsyncClient, db: AsyncSession):
    # 1. Login/Auth Stub
    from app.api.deps_auth import get_current_user
    from app.db.models.user import User
    from app.main import app
    import uuid
    
    user_id = uuid.uuid4()
    mock_user = User(id=user_id, email="test_upload@example.com", is_active=True, hashed_password="hashed", full_name="Test User")
    
    # We use a selective override for this test
    # IMPORTANT: We don't call app.dependency_overrides.clear() here 
    # to avoid breaking the 'db' fixture's own override.
    # Instead we manually restore it if needed, or better, use a context manager.
    
    original_user_deps = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    try:
        # 2. Test Presign
        with patch("app.services.storage_service.storage_service.presign_client.generate_presigned_url") as mock_gen:
            mock_gen.return_value = "http://minio/fake-presigned-url"
            
            payload = {
                "filename": "test-avocado.jpg",
                "contentType": "image/jpeg",
                "sizeBytes": 1024
            }
            
            response = await client.post("/uploads/presign", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert "uploadId" in data
            assert data["uploadUrl"] == "http://minio/fake-presigned-url"
            upload_id = data["uploadId"]

        # 3. Test Complete (Mocking S3 verification)
        with patch("app.services.storage_service.storage_service.s3_client.head_object") as mock_head:
            with patch("app.services.storage_service.storage_service.s3_client.get_object") as mock_get:
                # Mock HEAD response (size check)
                mock_head.return_value = {"ContentLength": 1024}
                
                # Mock GET response (magic bytes check for jpeg)
                # Helper to create a mock Body with read()
                mock_body = MagicMock()
                # JPEG magic bytes: FF D8 FF
                mock_body.read.return_value = b'\xff\xd8\xff\xe0' 
                mock_get.return_value = {"Body": mock_body}
                
                complete_payload = {"uploadId": upload_id}
                response = await client.post("/uploads/complete", json=complete_payload)
                assert response.status_code == 204

    finally:
        app.dependency_overrides.clear()
