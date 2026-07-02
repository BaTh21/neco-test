from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from sqlalchemy.sql import func
from app.models.base import Base
import enum

def utcnow():
    return datetime.now(timezone.utc)

class ReactionType(enum.Enum):
    like = "like"
    love = "love"
    laugh = "laugh"
    wow = "wow"
    sad = "sad"
    angry = "angry"

class GroupMessageReaction(Base):
    __tablename__ = "group_message_reactions"
    
    id = Column(Integer, primary_key=True)
    message_id = Column(Integer, ForeignKey("group_messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reaction = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    message = relationship("GroupMessage", back_populates="reactions")
    user = relationship("User")
    
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="unique_user_reaction"),
    )