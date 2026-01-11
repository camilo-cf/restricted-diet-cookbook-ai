import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, UUID4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db
from app.api.deps_auth import get_current_user
from app.db.models.user import User
from app.db.models.upload import Upload
from app.services.storage_service import storage_service
from app.core.config import settings

router = APIRouter()

class PresignRequest(BaseModel):
    filename: str
    contentType: str
    sizeBytes: int
    category: str = "recipes" # recipes | profiles

class PresignResponse(BaseModel):
    uploadId: UUID4
    uploadUrl: str
    imageUrl: str

class CompleteRequest(BaseModel):
    uploadId: UUID4

@router.post("/presign", response_model=PresignResponse)
async def create_presigned_url(
    payload: PresignRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if payload.sizeBytes > 8388608: # 8MB
        raise HTTPException(status_code=400, detail="File too large")
    
    if payload.contentType not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid content type")

    # Validate category
    category = payload.category if payload.category in ["recipes", "profiles"] else "recipes"

    # Generate unique key: category/user_id/uuid.ext
    ext = payload.filename.split(".")[-1] if "." in payload.filename else "bin"
    object_key = f"{category}/{current_user.id}/{uuid.uuid4()}.{ext}"

    url = storage_service.generate_presigned_url(object_key, payload.contentType)

    # Track intent
    upload_record = Upload(
        user_id=current_user.id,
        object_key=object_key,
        content_type=payload.contentType,
        is_completed=False
    )
    db.add(upload_record)
    await db.commit()
    await db.refresh(upload_record)

    # Calculate image URL for preview
    # Calculate image URL for preview
    # Use the proxy endpoint for ALL backends to support private buckets via authenticated/signed redirection
    image_url = f"{settings.PUBLIC_API_URL}/uploads/content/{object_key}"

    return {"uploadId": upload_record.id, "uploadUrl": url, "imageUrl": image_url}

@router.put("/direct-upload/{object_key:path}")
async def direct_upload(object_key: str, request: Request):
    """Fallback for when STORAGE_BACKEND=disk. Handles the PUT request from browser."""
    if settings.STORAGE_BACKEND != "disk":
        raise HTTPException(status_code=400, detail="Disk storage not enabled")
    
    file_path = os.path.join(settings.UPLOAD_DIR, object_key)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "wb") as f:
        f.write(await request.body())
    
    return Response(status_code=200)

@router.get("/content/{object_key:path}")
async def get_content(object_key: str):
    """
    Serve uploaded content. 
    1. If Disk: Serve file directly.
    2. If S3/R2: Redirect to a short-lived presigned GET URL (allows private buckets).
    """
    if settings.STORAGE_BACKEND == "disk":
        file_path = os.path.join(settings.UPLOAD_DIR, object_key)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(file_path)
    
    # S3/R2 Fallback logic
    try:
        # Generate a short-lived presigned GET URL (5 minutes)
        url = storage_service.generate_presigned_url(
            object_key, 
            content_type=None, 
            expiration=300, 
            operation="get_object"
        )
        return RedirectResponse(url)
    except Exception as e:
         print(f"Error generating presigned URL for {object_key}: {e}")
         raise HTTPException(status_code=404, detail="Content not accessible")

@router.post("/complete")
async def complete_upload(
    payload: CompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Upload).where(Upload.id == payload.uploadId, Upload.user_id == current_user.id))
    upload = result.scalars().first()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
        
    if upload.is_completed:
        return Response(status_code=204)

    try:
        storage_service.verify_upload(upload.object_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Storage verification failed")

    upload.is_completed = True
    await db.commit()
    
    return Response(status_code=204)
