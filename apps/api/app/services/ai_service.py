from openai import AsyncOpenAI
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
from app.core.circuit_breaker import steps_breaker, nutrition_breaker, CircuitBreakerOpen
from app.services.cost_guard import cost_guard
from typing import Dict, Any, Optional
import json

logger = structlog.get_logger()

class AIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-3.5-turbo" # Default for MVP

    async def generate_recipe(self, ingredients: list[str], restrictions: list[str]) -> Dict[str, Any]:
        """
        Generates a recipe using AI with circuit breaker protection.
        """
        # 1. Cost Guard Check
        if not cost_guard.can_proceed(estimated_cost=0.01):
            logger.warning("cost_guard_blocked", monthly_limit=cost_guard.monthly_limit_usd)
            raise Exception("Monthly cost limit exceeded")

        # 2. Circuit Breaker Wrap
        try:
            return await steps_breaker.call_async(self._generate_recipe_call, ingredients, restrictions)
        except CircuitBreakerOpen:
            logger.warning("circuit_breaker_open", feature="recipe_generation")
            # In a real app, fallback to cached or template recipe
            raise Exception("AI Service unavailable (Circuit Open)")
        except Exception as e:
            logger.error("recipe_generation_failed", error=str(e))
            raise e

    @retry(
        stop=stop_after_attempt(2), 
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception_type(Exception)
    )
    async def _generate_recipe_call(self, ingredients: list[str], restrictions: list[str]) -> Dict[str, Any]:
        prompt = f"""
        Create a recipe with these ingredients: {', '.join(ingredients)}.
        Restrictions: {', '.join(restrictions)}.
        Return strictly JSON matching specific schema.
        """
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a helpful chef."},
                {"role": "user", "content": prompt}
            ],
            timeout=25.0, # Strict timeout
            response_format={ "type": "json_object" }
        )
        
        # Track Usage
        usage = response.usage
        if usage:
            cost_guard.record_usage(usage.prompt_tokens, usage.completion_tokens, self.model)
            
        content = response.choices[0].message.content
        return json.loads(content)

ai_service = AIService()
