from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.services.ai_service import ai_service
from app.api.deps_auth import get_current_user
from app.db.models.user import User

router = APIRouter()

class RecipeGenerationRequest(BaseModel):
    ingredients: List[str]
    restrictions: List[str]
    user_notes: Optional[str] = None

@router.post("/recipe", summary="Generate Recipe")
async def generate_recipe_route(
    payload: RecipeGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        recipe = await ai_service.generate_recipe(
            ingredients=payload.ingredients,
            restrictions=payload.restrictions
        )
        return recipe
    except Exception as e:
        # Map specific AI errors to 400/409/429/503 as appropriate
        # For MVP, generic 503 or 400
        error_msg = str(e)
        if "limit exceeded" in error_msg:
            raise HTTPException(status_code=429, detail="Daily AI limit reached")
        if "Service unavailable" in error_msg:
             raise HTTPException(status_code=503, detail="AI Service temporarily unavailable")
             
        raise HTTPException(status_code=500, detail="Failed to generate recipe")
