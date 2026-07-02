from fastapi import Depends, APIRouter, HTTPException
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.config import settings
from sqlalchemy.orm import Session
from app.crud.chat_gateway import create_livekit_token
from app.schemas.livekit import TokenRequest

router = APIRouter()

@router.post("/token")
async def get_livekit_token(
    payload: TokenRequest,
    current_user = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = create_livekit_token(
        current_user.id, 
        current_user.username, 
        current_user.avatar_url, 
        payload.room)

    return {
        "token": token,
        "url": settings.LIVEKIT_URL,
        "room": payload.room
    }