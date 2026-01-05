import pytest
from unittest.mock import AsyncMock, patch
from app.services.ai_service import AIService
from app.core.circuit_breaker import CircuitBreakerOpen
from app.services.cost_guard import CostGuard

@pytest.mark.asyncio
async def test_circuit_breaker_activates():
    service = AIService()
    
    # Mock failures
    with patch("app.services.ai_service.AIService._generate_recipe_call", side_effect=Exception("API Error")) as mock_call:
        # Trip the breaker (threshold is 5)
        from app.core.circuit_breaker import steps_breaker
        steps_breaker.reset() # Ensure start fresh
        # 5 Failures
        for i in range(5):
             try:
                 await service.generate_recipe([], [])
             except Exception:
                 pass
        
        # 6th call should raise CircuitBreakerOpen immediately
        # We catch specific string pattern or check type if we exported it
        try:
            await service.generate_recipe([], [])
            assert False, "Should have raised exception"
        except Exception as e:
            # Expected "AI Service unavailable (Circuit Open)" or similar
            assert "Circuit Open" in str(e) or "unavailable" in str(e), f"Unexpected error: {e}"

@pytest.mark.asyncio
async def test_cost_guard_blocks():
    # Force limit exceeded
    from app.services.ai_service import cost_guard
    cost_guard.current_spend_usd = 100.0
    cost_guard.monthly_limit_usd = 50.0
    
    service = AIService()
    with pytest.raises(Exception) as exc:
        await service.generate_recipe([], [])
    
    assert "limit exceeded" in str(exc.value)
