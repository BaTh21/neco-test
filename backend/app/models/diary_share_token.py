# app/models/diary_share_token.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from app.models.base import Base
from datetime import datetime, timezone

class DiaryShareToken(Base):
    __tablename__ = "diary_share_tokens"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    diary_id = Column(Integer, ForeignKey("diaries.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    view_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime, nullable=True)