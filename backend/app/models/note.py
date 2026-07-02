from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, JSON, ForeignKey
from sqlalchemy.sql import func
from app.models.base import Base
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.mutable import MutableList

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User") 
    
    is_pinned = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    color = Column(String(20), default="#ffffff")

    # Share settings
    share_type = Column(String(20), default="private")
    shared_with = Column(MutableList.as_mutable(JSON), default=list)
    can_edit = Column(Boolean, default=False)
    
    # Use timezone‑aware columns
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Optional: share_expires should also be timezone‑aware
    share_token = Column(String(255), nullable=True)
    share_expires = Column(DateTime(timezone=True), nullable=True)