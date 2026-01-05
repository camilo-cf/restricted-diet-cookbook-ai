from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps_auth import get_current_user, get_db
from app.core.security import create_session_token, verify_password, get_password_hash
from app.core.config import settings
from app.db.models.user import User
from pydantic import BaseModel, EmailStr, UUID4

router = APIRouter()

# --- Schemas (Should align with OpenAPI) ---
class LoginRequest(BaseModel):
    username: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID4
    email: EmailStr
    full_name: str
    is_active: bool
    
    class Config:
        from_attributes = True

# --- Endpoints ---
@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Check if email exists
    result = await db.execute(select(User).where(User.email == credentials.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Create User
    new_user = User(
        email=credentials.username,
        hashed_password=get_password_hash(credentials.password),
        full_name=credentials.username.split("@")[0], # Simple default
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user

@router.post("/login", response_model=UserResponse)
async def login(
    response: Response,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Find user
    result = await db.execute(select(User).where(User.email == credentials.username))
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        # Return generic error to avoid enumeration
        # Using 401 as per spec, but could be problem+json
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    # 2. Create session
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_session_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    # 3. Set Cookie
    response.set_cookie(
        key="session_id",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False, # Set to True in Prod (handled by logic logic below or nginx)
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return user

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="session_id", httponly=True, samesite="lax")
    return {"message": "Logout successful"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
