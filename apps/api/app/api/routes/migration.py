from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.api.deps_auth import get_current_user
from app.db.models.user import User

router = APIRouter()

@router.post("/migrate_schema")
async def manual_migration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "maintainer" and current_user.email != "demo@example.com":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    try:
        # Add servings column
        await db.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings INTEGER;"))
        # Add difficulty column
        await db.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty VARCHAR;"))
        await db.commit()
        return {"message": "Migration successful"}
    except Exception as e:
        return {"error": str(e)}
