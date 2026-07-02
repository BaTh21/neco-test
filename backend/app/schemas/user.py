from pydantic import BaseModel, EmailStr
from typing import Optional
from app.schemas.base import TimestampMixin


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserOut(UserBase, TimestampMixin):
    id: int
    is_verified: bool
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_2fa_enabled: bool
    is_activate: Optional[bool] = None
    is_email_2sa_enabled : Optional[bool] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    
class AvatarUploadResponse(BaseModel):
    success: bool
    avatar_url: str
    message: Optional[str] = None
    
class UsernameUpdate(BaseModel):
    username: str