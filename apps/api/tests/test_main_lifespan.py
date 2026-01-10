import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from app.main import lifespan

@pytest.mark.asyncio
async def test_lifespan_events():
    app = MagicMock()
    # Mock settings to trigger different paths
    with patch("app.main.settings") as mock_settings:
        mock_settings.DATABASE_URL = "postgresql+asyncpg://user:pass@host/db"
        mock_settings.CORS_ORIGINS = ["http://localhost:3000"]
        
        # Patch the engine object itself in its module
        with patch("app.main.engine") as mock_engine:
            mock_conn = AsyncMock()
            mock_engine.begin.return_value.__aenter__.return_value = mock_conn
            
            # Patch AsyncSessionLocal where it lives
            with patch("app.db.session.AsyncSessionLocal") as mock_session:
                mock_db = AsyncMock()
                mock_session.return_value.__aenter__.return_value = mock_db
                # Mock User check (user exists)
                mock_db.execute.return_value = MagicMock(scalars=MagicMock(first=lambda: MagicMock()))
                
                with patch("app.services.storage_service.storage_service.initialize") as mock_storage_init:
                    async with lifespan(app):
                        pass
                
                    assert mock_engine.begin.called
                    assert mock_db.execute.called

@pytest.mark.asyncio
async def test_lifespan_error_handling():
    app = MagicMock()
    with patch("app.main.settings") as mock_settings:
        mock_settings.DATABASE_URL = "postgresql+asyncpg://user:pass@host/db"
        with patch("app.main.engine") as mock_engine:
            mock_engine.begin.side_effect = Exception("DB error")
            with patch("app.db.session.AsyncSessionLocal") as mock_session:
                mock_db = AsyncMock()
                mock_session.return_value.__aenter__.return_value = mock_db
                # Mock User check (user exists)
                mock_db.execute.return_value = MagicMock(scalars=MagicMock(first=lambda: MagicMock()))
                
                with patch("app.services.storage_service.storage_service.initialize"):
                    # Should not raise exception
                    async with lifespan(app):
                        pass
                
                assert mock_engine.begin.called
