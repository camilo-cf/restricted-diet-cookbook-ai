from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.middleware.logging import RequestIDMiddleware
from app.api.routes import auth, health

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Middleware
app.add_middleware(RequestIDMiddleware)

if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

from app.api.routes import auth, health, uploads, ai

# ...

# Routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])

@app.get("/")
def root():
    return {"message": "Welcome to Restricted Diet Cookbook AI API"}
