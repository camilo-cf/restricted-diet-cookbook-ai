from fastapi import APIRouter
from sqlalchemy import text
from app.api.deps import get_db
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
import boto3
from botocore.exceptions import ClientError

router = APIRouter()

@router.get("", summary="System Health Check")
async def health_check(db: AsyncSession = Depends(get_db)):
    health_status = {
        "status": "ok",
        "checks": {
            "db": "unknown",
            "storage": "unknown",
            "ai": "unknown"
        }
    }
    
    # 1. Check DB
    try:
        await db.execute(text("SELECT 1"))
        health_status["checks"]["db"] = "ok"
    except Exception:
        health_status["checks"]["db"] = "down"
        health_status["status"] = "degraded"

    # 2. Check Storage (MinIO)
    try:
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.AWS_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        s3.head_bucket(Bucket=settings.AWS_BUCKET_NAME)
        health_status["checks"]["storage"] = "ok"
    except Exception as e:
        # Check if bucket missing or connection failed
        health_status["checks"]["storage"] = "down"
        health_status["status"] = "degraded"

    # 3. Check AI (Configuration only for now)
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("sk-"):
        health_status["checks"]["ai"] = "ok"
    else:
        health_status["checks"]["ai"] = "fail"
        health_status["status"] = "degraded"
        
    return health_status
