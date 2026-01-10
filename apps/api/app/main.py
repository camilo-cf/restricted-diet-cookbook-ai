from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.middleware.logging import RequestIDMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.db.base import Base
from app.db.session import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (Dev only or first run)
    # Skip for SQLite (tests) to avoid hangs on production connection
    if not settings.DATABASE_URL.startswith("sqlite"):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            print(f"Skipping lifespan table creation: {e}")
            
    # Initialize Storage (Bucket/CORS)
    from app.services.storage_service import storage_service
    storage_service.initialize()
    
    # Create Demo User if not exists
    from sqlalchemy import select
    from app.db.models.user import User
    from app.core.security import get_password_hash
    from app.db.session import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "demo@example.com"))
        if not result.scalars().first():
            demo_user = User(
                email="demo@example.com",
                hashed_password=get_password_hash("password"),
                full_name="Demo User",
                role="maintainer",
                is_active=True
            )
            db.add(demo_user)
            await db.commit()
            print("Successfully created seed demo user")
    
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Middleware order: Security Headers -> Request ID -> Logging -> CORS -> Trusted Host
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

if settings.CORS_ORIGINS:
    print(f"DEBUG: Loading CORS_ORIGINS: {settings.CORS_ORIGINS}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

from app.api.routes import auth, health, uploads, ai, recipes

# ...

# Routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])

app.include_router(recipes.router, prefix="/recipes", tags=["recipes"])

@app.get("/")
def root():
    return {"message": "Welcome to Restricted Diet Cookbook AI API"}
