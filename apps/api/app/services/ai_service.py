from openai import AsyncOpenAI
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
from app.core.circuit_breaker import steps_breaker, nutrition_breaker, CircuitBreakerOpen
from app.services.cost_guard import cost_guard
from typing import Dict, Any, Optional
import json

import base64

logger = structlog.get_logger()

class AIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o" # Capable of Vision

    async def generate_recipe(self, ingredients: list[str], restrictions: list[str], image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        """
        Generates a recipe using AI with circuit breaker protection.
        """
        # 1. Cost Guard Check
        if not cost_guard.can_proceed(estimated_cost=0.03): # Higher cost for vision
            logger.warning("cost_guard_blocked", monthly_limit=cost_guard.monthly_limit_usd)
            raise Exception("Monthly cost limit exceeded")

        # 2. Circuit Breaker Wrap
        try:
            return await steps_breaker.call_async(self._generate_recipe_call, ingredients, restrictions, image_bytes)
        except CircuitBreakerOpen:
            logger.warning("circuit_breaker_open", feature="recipe_generation")
            # In a real app, fallback to cached or template recipe
            raise Exception("AI Service unavailable (Circuit Open)")
        except Exception as e:
            logger.error("recipe_generation_failed", error=str(e))
            raise e

    async def validate_ingredients(self, ingredients: list[str], restrictions: list[str]) -> list[Dict[str, str]]:
        """
        Validates a list of ingredients against dietary restrictions.
        Returns a list of issues found.
        """
        if not ingredients or not restrictions:
            return []

        # 1. Cost Guard Check
        if not cost_guard.can_proceed(estimated_cost=0.01):
            logger.warning("cost_guard_blocked", monthly_limit=cost_guard.monthly_limit_usd)
            raise Exception("Monthly cost limit exceeded")

        system_prompt = (
            "You are a world-class food safety and nutrition expert. "
            "Your task is to identify ingredients that violate the specified dietary restrictions. "
            "Be thorough: check for hidden ingredients (e.g., hidden sugars in sauces, gluten in soy sauce). "
            "Output valid JSON: { \"issues\": [ { \"ingredient\": string, \"issue\": string, \"suggestion\": string } ] }. "
            "The 'issue' field should briefly explain the violation. "
            "The 'suggestion' should be a safe, delicious alternative. "
            "If no issues, return an empty list for \"issues\"."
        )
        
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        prompt = f"Ingredients: {', '.join(ingredients)}\nRestrictions: {', '.join(restrictions)}"
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini", # Use a cheaper model for validation
            messages=messages,
            response_format={ "type": "json_object" }
        )

        content = response.choices[0].message.content
        data = json.loads(content)
        return data.get("issues", [])

    @retry(
        stop=stop_after_attempt(2), 
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception_type(Exception)
    )
    async def _generate_recipe_call(self, ingredients: list[str], restrictions: list[str], image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        
        system_prompt = (
            "You are a helpful home cook assistant. Generate a practical, delicious recipe. "
            "Be accurate with times and servings:\n"
            "- prep_time_minutes: Time to prepare ingredients (chopping, measuring). Usually 5-30 min.\n"
            "- cook_time_minutes: Time for actual cooking. 0 for no-cook recipes.\n"
            "- servings: Number of people the recipe serves (typically 2-6).\n"
            "- difficulty: 'Easy', 'Medium', or 'Hard'.\n\n"
            "STRICT RULES:\n"
            "1. NEVER use ingredients that violate the provided dietary restrictions.\n"
            "2. Be realistic with prep and cook times.\n"
            "3. Instructions should be clear and numbered.\n\n"
            "Output valid JSON: { title: str, description: str, ingredients: string[], instructions: string[], "
            "dietary_tags: string[], prep_time_minutes: int, cook_time_minutes: int, servings: int, difficulty: str }."
        )

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        user_content = []
        
        # Text Prompt
        restrictions_text = f"Dietary restrictions: {', '.join(restrictions)}." if restrictions else ""
        if ingredients:
            prompt_text = f"Create a recipe using: {', '.join(ingredients)}. {restrictions_text}"
        else:
            prompt_text = f"Identify ingredients from the photo and create a recipe. {restrictions_text}"
            
        user_content.append({"type": "text", "text": prompt_text})

        # Image Prompt
        if image_bytes:
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_image}"
                }
            })

        messages.append({"role": "user", "content": user_content})
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            timeout=45.0, # Vision takes longer
            response_format={ "type": "json_object" }
        )
        
        # Track Usage
        usage = response.usage
        if usage:
            cost_guard.record_usage(usage.prompt_tokens, usage.completion_tokens, self.model)
            
        content = response.choices[0].message.content
        return json.loads(content)

ai_service = AIService()
