import pytest
from httpx import AsyncClient
from app.main import app
from app.core.config import settings

@pytest.mark.asyncio
async def test_security_headers():
    async with AsyncClient(app=app, base_url="http://localhost") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
        assert "strict-origin-when-cross-origin" in response.headers["Referrer-Policy"]

@pytest.mark.asyncio
async def test_path_traversal_prevention():
    # Test that storage service blocks '..'
    from app.services.storage_service import storage_service
    
    with pytest.raises(ValueError, match="Invalid object name|Path traversal attempt"):
        storage_service.verify_upload("../etc/passwd")

@pytest.mark.asyncio
async def test_auth_rate_limiting(monkeypatch):
    # Temporarily disable the TESTING bypass to test the rate limiter
    monkeypatch.setenv("TESTING", "False")
    
    async with AsyncClient(app=app, base_url="http://localhost") as ac:
        # 5 per minute is the limit
        for _ in range(5):
            await ac.post("/auth/login", json={"username": "test@example.com", "password": "wrong"})
        
        # 6th should be blocked
        response = await ac.post("/auth/login", json={"username": "test@example.com", "password": "wrong"})
        assert response.status_code == 429
        assert "Too many login/register attempts" in response.json()["detail"]
