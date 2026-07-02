import base64
from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Union
from app.schemas.base import TimestampMixin
from datetime import datetime, timezone
import enum

class MessageType(enum.Enum):
    text = "text"
    image = "image"
    file = "file"
    voice = "voice"
    video = "video"
    system = "system"

class UserResponse(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None
    email: str
    
class PrivateMessageOut(BaseModel):
    id: int
    content: str
    message_type: str
    created_at: datetime

    class Config:
        orm_mode = True

class UserWithPinned(UserResponse):
    pinned_message: Optional[PrivateMessageOut] = None

class FriendResponse(BaseModel):
    id: int
    user: Optional[UserResponse] = None
    friend: Optional[UserResponse] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
        
class PinnedByUserOut(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None

    class Config:
        orm_mode = True
        
class FriendDetailsResponse(BaseModel):
    id: int
    username: str
    email:  str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

    pinned_message: Optional[PrivateMessageOut] = None
    pinned_by_user: Optional[PinnedByUserOut] = None
    
    class Config:
        from_attributes = True