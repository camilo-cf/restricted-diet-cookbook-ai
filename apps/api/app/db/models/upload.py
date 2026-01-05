import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Upload(Base):
    __tablename__ = "item_uploads" # 'uploads' is reserved keyword in some DBs, safety first

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    object_key = Column(String, unique=True, nullable=False)
    content_type = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    # Add timestamps via mixin later or direct column
