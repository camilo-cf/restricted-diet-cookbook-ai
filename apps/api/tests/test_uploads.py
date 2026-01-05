import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock, patch

@pytest.mark.asyncio
async def test_upload_flow(client: AsyncClient, db_session):
    # 1. Login/Auth Stub
    # We need to mock get_current_user or actually login in integration tests.
    # For now, let's override the dependency or seed a user and login.
    # Overriding dependency is cleaner for unit/integration mix.
    
    from app.api.deps_auth import get_current_user
    from app.db.models.user import User
    from app.main import app
    import uuid
    
    user_id = uuid.uuid4()
    mock_user = User(id=user_id, email="test@example.com", is_active=True, hashed_password="hashed", full_name="Test User")
    
    app.dependency_overrides[get_current_user] = lambda: mock_user

    try:
        # 2. Test Presign
        with patch("app.services.storage_service.storage_service.s3_client.generate_presigned_url") as mock_gen:
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
