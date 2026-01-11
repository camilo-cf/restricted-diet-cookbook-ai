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
from app.middleware.security import rate_limit_auth

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
    role: str
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
        # Use proxy endpoint for ALL backends (supports private buckets via redirect)
        profile_url = f"{settings.PUBLIC_API_URL}/uploads/content/{user.profile_image.object_key}"
    
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
        role=user.role,
        is_active=user.is_active
    )

# --- Endpoints ---
@router.post("/register", response_model=UserResponse, status_code=201, dependencies=[Depends(rate_limit_auth)])
async def register(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Check if email exists
    result = await db.execute(select(User).where(User.email == credentials.username))
    if result.scalars().first():
        print(f"DEBUG: Registration failed for {credentials.username} - already exists")
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

@router.post("/login", response_model=UserResponse, dependencies=[Depends(rate_limit_auth)])
async def login(
    response: Response,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Find user
    print(f"DEBUG: Login attempt for {credentials.username}")
    result = await db.execute(select(User).options(selectinload(User.profile_image)).where(User.email == credentials.username))
    user = result.scalars().first()
    
    if not user:
        print(f"DEBUG: User not found: {credentials.username}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
    if not verify_password(credentials.password, user.hashed_password):
        print(f"DEBUG: Password mismatch for {credentials.username}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    # 2. Create session
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_session_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    # 3. Set Cookie
    # Note: For cross-site frontend/backend on Render subdomains, 
    # we MUST use samesite="none" and secure=True.
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    print(f"DEBUG: Login successful for {user.email}")
    return to_user_response(user)

@router.post("/logout")
async def logout(response: Response):
    # Use SameSite=None and Secure=True to match the login cookie attributes
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME, 
        httponly=True, 
        samesite="none", 
        secure=True
    )
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
    
    # 2. Update Image (including deletion)
    if "profileImageId" in user_in.model_dump(exclude_unset=True):
        if user_in.profileImageId is None:
            # Explicitly delete the profile picture
            current_user.profile_image_id = None
        else:
            # Set a new profile picture
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

@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_user_me(
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permanently delete the current user's account.
    """
    # Verify not demo user (optional, but good practice for this specific app)
    if current_user.email == "demo@example.com":
        raise HTTPException(status_code=403, detail="Cannot delete demo account")

    try:
        import uuid
        
        # Soft Delete: Anonymize and deactivate to preserve recipes (posts)
        
        # 1. Remove profile picture reference
        current_user.profile_image_id = None
        
        # 2. Anonymize Personal Information
        # Maintain email uniqueness constraint by using a unique deleted pattern
        unique_suffix = uuid.uuid4().hex[:8]
        current_user.email = f"deleted_{current_user.id}_{unique_suffix}@deleted.user"
        current_user.full_name = "Deleted User"
        current_user.bio = "This user has deleted their account."
        current_user.dietary_preferences = None
        
        # 3. Securely scramble password and deactivate
        current_user.hashed_password = f"deleted_{uuid.uuid4()}" 
        current_user.is_active = False
        
        db.add(current_user)
        await db.commit()

        print(f"User {current_user.id} soft-deleted successfully")

    except Exception as e:
        print(f"Error deleting user: {str(e)}")
        # Rollback in case of partial failure
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete account data: {str(e)}")
    
    # Clear session cookie - being explicit about domain/path/secure to ensure browser accepts it
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        httponly=True,
        samesite="none",
        secure=True
    )
    # Double tap: set it to empty string with immediate expiration
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value="",
        httponly=True,
        max_age=0,
        expires=0,
        samesite="none",
        secure=True
    )
    
    return JSONResponse(status_code=status.HTTP_200_OK, content={"message": "Account deleted successfully"})
