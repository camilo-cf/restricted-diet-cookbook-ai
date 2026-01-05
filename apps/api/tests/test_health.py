import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    # Mock DB execution
    # We can't easily mock the dependency injection resolution for `db` inside the route 
    # unless we override the dependency. 
    # But `client` fixture already overrides `get_db`.
    # So we just need to ensure the `db_session` fixture allows execution.
    # Our sqlite mocks might work naturally for "SELECT 1".
    
    # Mock Boto3
    with patch("app.api.routes.health.boto3.client") as mock_boto:
        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3
        
        # Mock successful head_bucket
        mock_s3.head_bucket.return_value = {}

        # Mock Settings (if needed, but defaults might be fine)
        # We can assume settings are loaded.
        
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["checks"]["db"] == "ok"
        assert data["checks"]["storage"] == "ok"
        assert data["checks"]["ai"] in ["ok", "fail"] # Depends on env var presence

