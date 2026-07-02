from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from typing import Literal, Optional, List
from app.schemas.base import TimestampMixin
from datetime import datetime, timezone
from pydantic import validator, field_validator
from pydantic import Field
from typing import Dict

from app.models.private_message import MessageType

MessageTypeInput = Literal["text", "image", "file", "voice", "system", "video"]

class MessageCreate(BaseModel):
    content: str
    message_type: MessageTypeInput = "text"
    reply_to_id: Optional[int] = None
    is_forwarded: Optional[bool] = False  
    original_sender: Optional[str] = None  
    voice_duration: Optional[float] = None 
    file_size: Optional[int] = None 
    
    @field_validator('voice_duration')
    @classmethod
    def voice_duration_required(cls, v, info):
        # Get the entire data being validated
        data = getattr(info, 'data', {})
        message_type = data.get('message_type')
        
        if message_type == 'voice' and v is None:
            raise ValueError('voice_duration is required for voice messages')
        return v

    @field_validator('content')
    @classmethod
    def content_must_be_url_for_voice(cls, v, info):
        # Get the entire data being validated
        data = getattr(info, 'data', {})
        message_type = data.get('message_type')
        
        if message_type == 'voice':
            if not v.startswith(('http://', 'https://')):
                raise ValueError('Voice message content must be a valid URL')
        elif not v or not v.strip():
            raise ValueError('Text message cannot be empty')
        return v
    

class MessageSeenByUser(BaseModel):
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    seen_at: str
    
class ReactionGroup(BaseModel):
    emoji: str
    count: int
    user_ids: list[int]
    
class ReplyPreview(BaseModel):
    id: int
    sender_username: str
    content: str
    message_type: str
    voice_duration: Optional[float] = None
    file_size: Optional[int] = None

class MessageOut(TimestampMixin):
    id: int
    temp_id: Optional[str] = None
    sender_id: int
    receiver_id: int
    content: str
    message_type: MessageTypeInput  
    is_read: bool = False
    reply_to_id: Optional[int] = None
    reply_to: Optional[ReplyPreview] = None
    read_at: Optional[str] = None  
    delivered_at: Optional[str] = None
    created_at: str 
    edited_at: Optional[str] = None
    is_forwarded: Optional[bool] = False
    forwarded_from_id: Optional[int] = False
    original_sender: Optional[str] = None
    original_sender_avatar: Optional[str] = None
    sender_username: Optional[str] = None
    sender_avatar_url: Optional[str] = None
    receiver_username: Optional[str] = None
    voice_duration: Optional[float] = None  # ADDED
    file_size: Optional[int] = None  # ADDED
    reactions: list[ReactionGroup] = []
    my_reaction: Optional[str] = None
    
class AuthorResponse(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None
    
class ReplyResponse(BaseModel):
    id: Optional[int] = None
    content: Optional[str] = None
    created_at: Optional[datetime] = None
    sender: AuthorResponse

    class Config:
        from_attributes = True

class ParentMessageResponse(BaseModel):
    id: int
    sender: AuthorResponse
    content: Optional[str] = None
    call_content: Optional[str] = None
    file_url: Optional[str] = None
    voice_url: Optional[str] = None
    message_type: Optional[str] = None
    
class MarkMessagesAsReadRequest(BaseModel):
    message_ids: List[int]
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message_ids": [1, 2, 3, 4]
            }
        }
    )

class MarkMessagesAsReadResponse(BaseModel):
    status: str
    marked_count: int
    message_ids: List[int]    
    
    
class GroupMessageSeen(BaseModel):
    id: int
    user: Optional[AuthorResponse] = None    
    seen_at: datetime

class GroupMessageOut(BaseModel):
    id: int
    incoming_temp_id: Optional[str] = None
    sender: AuthorResponse
    forwarded_by: Optional[AuthorResponse] = None
    group_id: int
    content: Optional[str] = None
    call_content: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    file_url: Optional[str] = None
    voice_url: Optional[str] = None
    seen_by: Optional[List[GroupMessageSeen]] = []
    temp_id: Optional[str] = None
    message_type: str
    
    parent_message: Optional[ParentMessageResponse] = None
    reaction_summary: Optional[Dict[str, int]] = {}
    my_reaction: Optional[str] = None

    class Config:
        from_attributes = True
        
class ChatListItem(BaseModel):
    id: int
    type: Literal["private", "group"]
    name: str
    avatar: Optional[str]
    last_message: Optional[str]
    last_message_type: Optional[MessageType] = None
    updated_at: datetime
    # creator: Optional[AuthorResponse] = None,
    unread_count: Optional[int] = None
    
class ReactionRequest(BaseModel):
    message_id: int
    emoji: str

