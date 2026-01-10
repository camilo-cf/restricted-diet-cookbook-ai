from typing import Annotated
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.core.config import settings
from app.core.security import verify_token
# We need to create security.py with verify_token first or imports fail.
# I will create a stub here and then implement security.py properly.


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    # 1. Get session_id from strict httpOnly cookie
    token = request.cookies.get("session_id")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    # 2. Verify token (stateless signed cookie for MVP, containing user_id)
    # In a real app we might check a Redis session store
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    # 3. Get user from DB
    import uuid
    uid = uuid.UUID(user_id)
    user = await db.get(User, uid)
    if not user:
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
        
    return user
