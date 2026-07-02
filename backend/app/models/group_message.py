# app/models/group_message.py
from sqlalchemy import Column, Enum, Boolean, DateTime, ForeignKey, Text, Integer, String, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime, timezone
import enum
import enum
from sqlalchemy import Enum
from app.models.group_message_seen import GroupMessageSeen
from app.models.group_message_reaction import GroupMessageReaction
from sqlalchemy.dialects.postgresql import JSON

def utcnow():
    return datetime.now(timezone.utc)

class MessageType(enum.Enum):
    text = "text"
    image = "image"
    file = "file"
    voice = "voice"
    system = "system"
    video = "video"

class GroupMessage(Base):
    __tablename__ = "group_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    forwarded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=True)
    call_content = Column(Text, nullable=True)
    can_join = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    message_type = Column(
        Enum(MessageType, name="message_type"),
        default=MessageType.text
    )
    file_url = Column(String(255), nullable=True)
    voice_url = Column(String(255), nullable=True)
    public_id = Column(String(255), nullable=True)
    voice_public_id = Column(String(255), nullable=True)
    parent_message_id = Column(Integer, ForeignKey("group_messages.id", ondelete="SET NULL"), nullable=True)
    forwarded_at = Column(DateTime(timezone=True), nullable=True)
    is_pinned = Column(Boolean, default=False)
    pinned_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    pinned_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    group = relationship("Group", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    forwarded_by = relationship("User", foreign_keys=[forwarded_by_id])
    seen_by = relationship("GroupMessageSeen", back_populates="message", cascade="all, delete-orphan")
    extra_data = Column(JSON, nullable=True)
    
    # Self-referential
    parent_message = relationship(
        "GroupMessage",
        remote_side=[id],
        back_populates="child_messages",
        uselist=False
    )
    child_messages = relationship(
        "GroupMessage",
        back_populates="parent_message",
        cascade="all, delete-orphan"
    )

    # Replies from GroupMessageReply
    replies = relationship("GroupMessageReply", back_populates="message")
    
    pinned_by = relationship("User", foreign_keys=[pinned_by_id])
    
    reactions = relationship(
        "GroupMessageReaction",
        back_populates="message",
        cascade="all, delete-orphan"
    )
    
    reaction_summary = Column(JSON, nullable=True)

