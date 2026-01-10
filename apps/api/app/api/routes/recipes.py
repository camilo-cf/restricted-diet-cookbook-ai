from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.api.deps import get_db
from app.api.deps_auth import get_current_user
from app.db.models.recipe import Recipe
from app.db.models.user import User
from app.core.config import settings

router = APIRouter()

# --- Response Model ---
class RecipeResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    ingredients: List[str]
    instructions: List[str]
    dietaryTags: List[str] = []
    prepTimeMinutes: Optional[int] = None
    cookTimeMinutes: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    calories: Optional[int] = None
    created_at: datetime
    imageUrl: Optional[str] = None
    userId: UUID

    class Config:
        from_attributes = True

class RecipeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    ingredients: List[str]
    instruction_text: str
    dietary_tags: List[str]

# Helper to map DB model to Response
def to_recipe_response(recipe: Recipe) -> RecipeResponse:
    image_url = None
    if recipe.upload:
        if settings.STORAGE_BACKEND == "disk":
            image_url = f"{settings.PUBLIC_API_URL}/uploads/content/{recipe.upload.object_key}"
        else:
            # Use PUBLIC_AWS_ENDPOINT_URL for browser-accessible links
            base_url = settings.PUBLIC_AWS_ENDPOINT_URL or settings.AWS_ENDPOINT_URL
            image_url = f"{base_url}/{settings.AWS_BUCKET_NAME}/{recipe.upload.object_key}"
    
    return RecipeResponse(
        id=recipe.id,
        title=recipe.title,
        description=recipe.description,
        ingredients=recipe.ingredients or [],
        instructions=recipe.instructions or [],
        dietaryTags=recipe.dietary_tags or [],
        prepTimeMinutes=recipe.prep_time_minutes,
        cookTimeMinutes=recipe.cook_time_minutes,
        servings=getattr(recipe, "servings", None),
        difficulty=getattr(recipe, "difficulty", None),
        calories=None, # Not in DB yet
        created_at=recipe.created_at,
        imageUrl=image_url,
        userId=recipe.user_id
    )

@router.get("", response_model=Any) # Should be List[RecipeResponse]
async def get_recipes(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    dietary_tags: Optional[str] = Query(None)
) -> Any:
    """
    List public recipes with search and filtering.
    """
    tags_list = dietary_tags.split(",") if dietary_tags else []
    query = select(Recipe).options(selectinload(Recipe.upload))
    
    if q:
        from sqlalchemy import cast, String
        search_filter = or_(
            Recipe.title.ilike(f"%{q}%"),
            Recipe.description.ilike(f"%{q}%"),
            cast(Recipe.ingredients, String).ilike(f"%{q}%"),
            cast(Recipe.dietary_tags, String).ilike(f"%{q}%")
        )
        query = query.where(search_filter)
    
    if tags_list:
        from sqlalchemy import cast, String
        # For JSON columns, we can search for exact matches or use a more complex logic
        # Overlap is Postgres specific. A more portable way for small sets is multiple ORs or casting.
        # Since this is a cookbook, let's stick to a robust way.
        for tag in tags_list:
             query = query.where(cast(Recipe.dietary_tags, String).ilike(f"%{tag}%"))
    
    # Simple pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    recipes = result.scalars().all()
    
    data = [to_recipe_response(r) for r in recipes]
    
    return {"data": data, "hasMore": len(recipes) == limit}

@router.get("/{id}", response_model=RecipeResponse)
async def read_recipe(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    # Public access: No current_user check
) -> Any:
    """
    Get recipe by ID. Public.
    """
    result = await db.execute(select(Recipe).options(selectinload(Recipe.upload)).where(Recipe.id == id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return to_recipe_response(recipe)

@router.patch("/{id}", response_model=RecipeResponse)
async def update_recipe(
    id: UUID,
    recipe_in: dict, # Receiving a dict for flexibility, normally would use a Pydantic schema
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update a recipe.
    """
    # Fetch by ID first to check owner vs role
    result = await db.execute(select(Recipe).options(selectinload(Recipe.upload)).where(Recipe.id == id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Permission Check: Owner, Admin, Maintainer, or Demo
    is_owner = recipe.user_id == current_user.id
    is_staff = current_user.role in ["admin", "maintainer"]
    is_demo = current_user.email == "demo@example.com"

    if not (is_owner or is_staff or is_demo):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not enough permissions to edit this recipe"
        )
    
    # Update fields
    for field in ["title", "description", "prep_time_minutes", "cook_time_minutes", "ingredients", "instructions", "dietary_tags"]:
        if field in recipe_in:
             val = recipe_in[field]
             setattr(recipe, field, val)

    # Handle camelCase inputs if coming from frontend
    if "prepTimeMinutes" in recipe_in:
        recipe.prep_time_minutes = recipe_in["prepTimeMinutes"]
    if "cookTimeMinutes" in recipe_in:
        recipe.cook_time_minutes = recipe_in["cookTimeMinutes"]
    if "dietaryTags" in recipe_in:
        recipe.dietary_tags = recipe_in["dietaryTags"]
    if "uploadId" in recipe_in:
        # Verify upload belongs to user
        from app.db.models.upload import Upload
        from uuid import UUID as PyUUID
        u_id = recipe_in["uploadId"]
        if isinstance(u_id, str):
            u_id = PyUUID(u_id)
        result = await db.execute(select(Upload).where(Upload.id == u_id, Upload.user_id == current_user.id))
        upload_record = result.scalars().first()
        if not upload_record:
             raise HTTPException(status_code=404, detail="Upload record not found")
        recipe.upload_id = upload_record.id
        
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    
    # Refresh upload relation for response
    # (Though update rarely changes upload currently, but needed for response)
    # We can just use the existing eager loaded 'recipe.upload' if it wasn't changed
    # Or reload. simpler to rely on lazy load triggers if not detached? 
    # But usage of 'to_recipe_response' accesses it.
    # SA Async requires explicit loading.
    # Let's re-fetch or assume it's loaded. 'refresh' might clear relationships?
    # Safe bet: re-fetch.
    result = await db.execute(select(Recipe).options(selectinload(Recipe.upload)).where(Recipe.id == recipe.id))
    recipe = result.scalars().first()

    return to_recipe_response(recipe)

@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    recipe_in: RecipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create a new recipe manually.
    """
    # instruction_text is stored as instructions (list) in DB for this project
    # If the user provides raw text, we might want to split it, 
    # but for manual create we expect consistency with the model.
    # The Recipe model uses 'instructions': List[str].
    # openapi says 'instruction_text' is the field for Create.
    
    new_recipe = Recipe(
        user_id=current_user.id,
        title=recipe_in.title,
        description=recipe_in.description or "",
        ingredients=recipe_in.ingredients,
        instructions=[s.strip() for s in recipe_in.instruction_text.split(".") if s.strip()],
        dietary_tags=recipe_in.dietary_tags,
    )
    
    db.add(new_recipe)
    await db.commit()
    await db.refresh(new_recipe)
    
    # Reload with upload relationship (none for new manual usually, but for consistency)
    result = await db.execute(select(Recipe).options(selectinload(Recipe.upload)).where(Recipe.id == new_recipe.id))
    new_recipe = result.scalars().first()
    
    return to_recipe_response(new_recipe)

@router.delete("/{id}")
async def delete_recipe(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete a recipe.
    """
    result = await db.execute(select(Recipe).where(Recipe.id == id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Permission Check: Owner, Admin, or Demo (Maintainers usually can't delete?)
    # Let's align with edit for Consistency: Owner, Admin, Maintainer, Demo
    is_owner = recipe.user_id == current_user.id
    is_staff = current_user.role in ["admin", "maintainer"]
    is_demo = current_user.email == "demo@example.com"

    if not (is_owner or is_staff or is_demo):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not enough permissions to delete this recipe"
        )
    
    await db.delete(recipe)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
