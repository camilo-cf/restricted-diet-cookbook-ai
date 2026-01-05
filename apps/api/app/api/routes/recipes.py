from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.db.session import get_db
from app.db.models.recipe import Recipe
from app.db.models.user import User
from app.api.routes.auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=None)
async def get_recipes(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None
) -> Any:
    """
    List public recipes with search.
    """
    query = select(Recipe)
    
    if q:
        query = query.where(
            or_(
                Recipe.title.ilike(f"%{q}%"),
                Recipe.description.ilike(f"%{q}%")
            )
        )
    
    # Simple pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    recipes = result.scalars().all()
    
    return {"data": recipes, "hasMore": len(recipes) == limit}

@router.get("/{id}", response_model=None)
async def read_recipe(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    # Public access: No current_user check
) -> Any:
    """
    Get recipe by ID. Public.
    """
    result = await db.execute(select(Recipe).where(Recipe.id == id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

@router.patch("/{id}", response_model=None)
async def update_recipe(
    id: UUID,
    recipe_in: dict, # Receiving a dict for flexibility, normally would use a Pydantic schema
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a recipe.
    """
    result = await db.execute(select(Recipe).where(Recipe.id == id, Recipe.user_id == current_user.id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Update fields
    for field in ["title", "description", "prep_time_minutes", "cook_time_minutes", "ingredients", "instructions", "dietary_tags"]:
        if field in recipe_in:
             # handle snake_case vs camelCase mismatch if necessary, 
             # but frontend usually sends JSON matching the API schema.
             # API Schema (Pydantic) usually maps snake_case.
             # User says backend returns snake_case. 
             # Let's support both or assume matching model attributes.
             val = recipe_in[field]
             setattr(recipe, field, val)

    # Handle camelCase inputs if coming from frontend
    if "prepTimeMinutes" in recipe_in:
        recipe.prep_time_minutes = recipe_in["prepTimeMinutes"]
    if "cookTimeMinutes" in recipe_in:
        recipe.cook_time_minutes = recipe_in["cookTimeMinutes"]
    if "dietaryTags" in recipe_in:
        recipe.dietary_tags = recipe_in["dietaryTags"]
        
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe

@router.delete("/{id}")
async def delete_recipe(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a recipe.
    """
    result = await db.execute(select(Recipe).where(Recipe.id == id, Recipe.user_id == current_user.id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    await db.delete(recipe)
    await db.commit()
    return {"ok": True}
