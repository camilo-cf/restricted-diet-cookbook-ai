from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from sqlalchemy import String, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    upload_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("item_uploads.id"), nullable=True)
    
    title: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str] = mapped_column(String)
    
    # Store lists as JSONB
    ingredients: Mapped[List[str]] = mapped_column(JSONB, default=list)
    instructions: Mapped[List[str]] = mapped_column(JSONB, default=list)
    dietary_tags: Mapped[List[str]] = mapped_column(JSONB, default=list)
    
    prep_time_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cook_time_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="recipes")
    upload = relationship("Upload")
