from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Restricted Diet Cookbook AI"
    API_V1_STR: str = ""
    
    # Database
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]
    
    # Storage
    STORAGE_BACKEND: str = "minio" # minio | disk
    UPLOAD_DIR: str = "uploads"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_BUCKET_NAME: str = "uploads"
    AWS_ENDPOINT_URL: str = ""
    PUBLIC_AWS_ENDPOINT_URL: str = "" # Defaults to AWS_ENDPOINT_URL if not set
    # AI
    OPENAI_API_KEY: str

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_ignore_empty=True,
        extra="ignore"
    )

settings = Settings()
