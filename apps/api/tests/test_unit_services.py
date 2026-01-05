import pytest
from app.core.security import verify_password, get_password_hash, create_session_token
from app.services.cost_guard import cost_guard, CostGuard
from unittest.mock import MagicMock, patch

def test_security_utils():
    password = "test_password"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrong", hashed)
    
    token = create_session_token(data={"sub": "test@example.com"})
    assert isinstance(token, str)

@pytest.mark.asyncio
async def test_cost_guard_unit():
    # Test a fresh instance to avoid global state interference
    guard = CostGuard(monthly_limit_usd=1.0)
    # Mock some usage
    guard.current_spend_usd = 0.5
    assert guard.can_proceed(0.1) is True
    assert guard.can_proceed(0.6) is False

@pytest.mark.asyncio
async def test_ai_service_unit():
    from app.services.ai_service import AIService
    service = AIService()
    
    # AIService uses the global cost_guard and circuit breakers.
    with patch("app.services.cost_guard.cost_guard.can_proceed", return_value=True):
        with patch("app.services.ai_service.steps_breaker.call_async") as mock_breaker_call:
            mock_breaker_call.return_value = {
                "title": "AI Recipe", 
                "ingredients": [], 
                "instructions": ["text"], 
                "dietary_tags": []
            }
            
            recipe = await service.generate_recipe("tomato", ["none"])
            assert "AI Recipe" in recipe["title"]

@pytest.mark.asyncio
async def test_storage_service_unit():
    from app.services.storage_service import StorageService
    # StorageService init takes no args
    with patch("app.services.storage_service.boto3.client") as mock_boto:
        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3
        service = StorageService()
        
        # Test presigned URL
        service.presign_client.generate_presigned_url = MagicMock(return_value="http://fake")
        url = service.generate_presigned_url("test.jpg", "image/jpeg")
        assert url == "http://fake"
