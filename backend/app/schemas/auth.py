from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
    
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    code: str
    new_password: str
    
class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=1)
    
class ChangeEmailRequest(BaseModel):
    new_email: EmailStr


class VerifyChangeEmailRequest(BaseModel):
    new_email: EmailStr
    code: str

class Enable2FARequest(BaseModel):
    code: str

class Verify2FARequest(BaseModel):
    code: str
    
class LoginResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None
    requires_2fa: bool = False
    temp_token: str | None = None
    method: str | None = None

class DeactivateAccountRequest(BaseModel):
    password: str
    
class VerifyEmail2SARequest(BaseModel):
    code: str