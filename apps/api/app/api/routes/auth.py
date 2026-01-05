from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import json

from app.api.deps_auth import get_current_user, get_db
from app.core.security import create_session_token, verify_password, get_password_hash
from app.core.config import settings
from app.db.models.user import User
from pydantic import BaseModel, EmailStr, UUID4

router = APIRouter()

from typing import Optional, List

# --- Schemas (Should align with OpenAPI) ---
class LoginRequest(BaseModel):
    username: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID4
    email: EmailStr
    full_name: str
    bio: Optional[str] = None
    dietaryPreferences: Optional[List[str]] = None
    profileImageUrl: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    dietaryPreferences: Optional[List[str]] = None
    profileImageId: Optional[UUID4] = None

def to_user_response(user: User) -> UserResponse:
    profile_url = None
    if user.profile_image:
        # Standard local MinIO endpoint
        base_url = "http://localhost:9000"
        profile_url = f"{base_url}/{settings.AWS_BUCKET_NAME}/{user.profile_image.object_key}"
    
    prefs = []
    if user.dietary_preferences:
        try:
            prefs = json.loads(user.dietary_preferences)
        except:
            prefs = []

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        bio=user.bio,
        dietaryPreferences=prefs,
        profileImageUrl=profile_url,
        is_active=user.is_active
    )

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
    
    # Reload with relations
    result = await db.execute(select(User).options(selectinload(User.profile_image)).where(User.id == new_user.id))
    new_user = result.scalars().first()
    
    return to_user_response(new_user)

@router.post("/login", response_model=UserResponse)
async def login(
    response: Response,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Find user
    result = await db.execute(select(User).options(selectinload(User.profile_image)).where(User.email == credentials.username))
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
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
        secure=False,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return to_user_response(user)

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="session_id", httponly=True, samesite="lax")
    return {"message": "Logout successful"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Reload with relations to ensure image is there
    result = await db.execute(select(User).options(selectinload(User.profile_image)).where(User.id == current_user.id))
    user = result.scalars().first()
    return to_user_response(user)

@router.patch("/me", response_model=UserResponse)
async def update_user_me(
    user_in: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Update basics
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.bio is not None:
        current_user.bio = user_in.bio
    if user_in.dietaryPreferences is not None:
        current_user.dietary_preferences = json.dumps(user_in.dietaryPreferences)
    
    # 2. Update Image
    if user_in.profileImageId is not None:
        from app.db.models.upload import Upload
        result = await db.execute(select(Upload).where(Upload.id == user_in.profileImageId, Upload.user_id == current_user.id))
        upload = result.scalars().first()
        if not upload:
            raise HTTPException(status_code=404, detail="Profile image upload not found")
        current_user.profile_image_id = upload.id
    
    db.add(current_user)
    await db.commit()
    
    # Reload with relations
    result = await db.execute(select(User).options(selectinload(User.profile_image)).where(User.id == current_user.id))
    user = result.scalars().first()
    return to_user_response(user)
