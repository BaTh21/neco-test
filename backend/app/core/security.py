import asyncio
from datetime import datetime, timedelta
import json
from typing import Optional
from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Secure password hashing context using argon2 (no 72-byte limit like bcrypt)
def create_password_context():
    """Create password context with argon2 - superior to bcrypt, no byte limits"""
    return CryptContext(
        schemes=["argon2"],
        default="argon2",
        deprecated="auto",
        argon2__memory_cost=65536,
        argon2__time_cost=3,
        argon2__parallelism=4,
    )

pwd_context = create_password_context()

def verify_token(token: str) -> Optional[dict]:
    """
    Verify JWT token and return payload
    """
    if not token:
        return None
    
    if not isinstance(token, str):
        return None
    
    parts = token.split('.')
    if len(parts) != 3:
        return None
    
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": True}
        )
        return payload
        
    except jwt.ExpiredSignatureError:
        return None
    except jwt.JWTError as e:
        return None
    except Exception as e:
        return None

def create_access_token(
    user_id: int,
    expires_delta: timedelta | None = None,
    token_type: str = "access",
    scope: str | None = None
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(days=90)

    expire = datetime.utcnow() + expires_delta

    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": token_type,
        "iat": datetime.utcnow()
    }

    if scope:
        payload["scope"] = scope

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=90)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(token)
    if not payload:
        raise credentials_exception
    
    token_type = payload.get("type")
    if token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception
    
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def hash_password(password: str) -> str:
    """Hash a password - no 72-byte limitation with pbkdf2_sha256"""
    try:
        return pwd_context.hash(password)
    except Exception as e:
        print(f"Password hashing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error hashing password"
        )

async def get_current_user_ws(
    websocket: WebSocket,
    db: Session = Depends(get_db)
) -> Optional[User]:
    try:
        token = None
        query_params = dict(websocket.query_params)
        if "token" in query_params:
            token = query_params["token"]
        
        if not token:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
                if data.get("type") == "auth" and data.get("token"):
                    token = data["token"]
            except (asyncio.TimeoutError, json.JSONDecodeError):
                return None
        
        if not token:
            return None
        
        payload = verify_token(token)
        if not payload:
            return None
        
        token_type = payload.get("type")
        if token_type != "access":
            return None
        
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            return None
        return user
        
    except Exception as e:
        print(f"WebSocket auth error: {e}")
        return None
    
def verify_2fa_token(token: str) -> int:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") != "2fa":
        raise HTTPException(status_code=403, detail="Invalid 2FA token")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Invalid token")

    return int(user_id_str)