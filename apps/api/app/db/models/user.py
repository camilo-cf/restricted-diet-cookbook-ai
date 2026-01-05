from sqlalchemy import Boolean, Column, String, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    bio = Column(String, nullable=True)
    dietary_preferences = Column(String, nullable=True) # Will store JSON string for SQLite/Universal compatibility
    role = Column(String, default="user") # user, admin, maintainer
    is_active = Column(Boolean, default=True)
    
    profile_image_id = Column(UUID(as_uuid=True), ForeignKey("item_uploads.id"), nullable=True)
    profile_image = relationship("Upload", foreign_keys=[profile_image_id])
    
    recipes = relationship("Recipe", back_populates="user", cascade="all, delete-orphan")
