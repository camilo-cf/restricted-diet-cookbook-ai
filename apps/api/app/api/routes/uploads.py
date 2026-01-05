import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, UUID4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db
from app.api.deps_auth import get_current_user
from app.db.models.user import User
from app.db.models.upload import Upload
from app.services.storage_service import storage_service

router = APIRouter()

class PresignRequest(BaseModel):
    filename: str
    contentType: str
    sizeBytes: int

class PresignResponse(BaseModel):
    uploadId: UUID4
    uploadUrl: str

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

    # Generate unique key: user_id/uuid.ext
    ext = payload.filename.split(".")[-1] if "." in payload.filename else "bin"
    object_key = f"{current_user.id}/{uuid.uuid4()}.{ext}"

    # Verify storage service is reachable/healthy implicitly via the call or trust it
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

    return {"uploadId": upload_record.id, "uploadUrl": url}

@router.post("/complete")
async def complete_upload(
    payload: CompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Get record
    result = await db.execute(select(Upload).where(Upload.id == payload.uploadId, Upload.user_id == current_user.id))
    upload = result.scalars().first()
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
        
    if upload.is_completed:
        return # Idempotent ok

    # 2. Verify in Storage
    try:
        storage_service.verify_upload(upload.object_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Storage verification failed")

    # 3. Mark complete
    upload.is_completed = True
    await db.commit()
    
    return Response(status_code=204) # No content from spec (wait, openapi spec says 204 or json?)
    # Spec says 204.
    # FastAPI returning Response(status_code=204) is safest.
from fastapi import Response
