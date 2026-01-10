from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, UUID4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.ai_service import ai_service
from app.services.storage_service import storage_service
from app.api.deps import get_db
from app.api.deps_auth import get_current_user
from app.db.models.user import User
from app.db.models.recipe import Recipe
from app.db.models.upload import Upload
from app.middleware.security import rate_limit_ai

router = APIRouter()

class RecipeGenerationRequest(BaseModel):
    ingredients: List[str] = [] # Optional if upload is present
    restrictions: List[str] = []
    uploadId: Optional[UUID4] = None
    user_notes: Optional[str] = None

@router.post("/recipe", summary="Generate Recipe", dependencies=[Depends(rate_limit_ai)])
async def generate_recipe_route(
    payload: RecipeGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    image_bytes = None
    upload_record = None

    # 1. Handle Upload if present
    if payload.uploadId:
        result = await db.execute(select(Upload).where(Upload.id == payload.uploadId, Upload.user_id == current_user.id))
        upload_record = result.scalars().first()
        if not upload_record:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        try:
            image_bytes = storage_service.download_file(upload_record.object_key)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to retrieve uploaded image")

    if not payload.ingredients and not image_bytes:
        raise HTTPException(status_code=400, detail="Must provide ingredients or an image")

    # 2. Call AI Service
    try:
        recipe_data = await ai_service.generate_recipe(
            ingredients=payload.ingredients,
            restrictions=payload.restrictions,
            image_bytes=image_bytes
        )
    except Exception as e:
        error_msg = str(e)
        if "limit exceeded" in error_msg:
            raise HTTPException(status_code=429, detail="Daily AI limit reached")
        if "Service unavailable" in error_msg:
             raise HTTPException(status_code=503, detail="AI Service temporarily unavailable")
        raise HTTPException(status_code=500, detail=f"Failed to generate recipe: {str(e)}")

    # 3. Save to DB
    new_recipe = Recipe(
        user_id=current_user.id,
        upload_id=upload_record.id if upload_record else None,
        title=recipe_data.get("title", "Untitled Recipe"),
        description=recipe_data.get("description", ""),
        ingredients=recipe_data.get("ingredients", []),
        instructions=recipe_data.get("instructions", []),
        dietary_tags=recipe_data.get("dietary_tags", []),
        prep_time_minutes=recipe_data.get("prep_time_minutes"),
        cook_time_minutes=recipe_data.get("cook_time_minutes")
    )
    
    db.add(new_recipe)
    await db.commit()
    await db.refresh(new_recipe)

    return new_recipe
class IngredientValidationRequest(BaseModel):
    ingredients: List[str]
    restrictions: List[str]

@router.post("/validate", summary="Validate Ingredients", dependencies=[Depends(rate_limit_ai)])
async def validate_ingredients_route(
    payload: IngredientValidationRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        issues = await ai_service.validate_ingredients(
            ingredients=payload.ingredients,
            restrictions=payload.restrictions
        )
        return {"issues": issues}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate ingredients: {str(e)}")
