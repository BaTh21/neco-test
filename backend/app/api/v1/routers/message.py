from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.group import GroupMessageUpdate, GroupMessageOut, GroupMessageResponse, PinMessageRequest, ReactionRequest
from app.models.user import User
from app.crud.message import update_message, delete_message, upload_file_message, update_file_message, upload_voice_message, delete_voice_message, pin_message, unpin_message, add_or_update_reaction
from app.schemas.chat import GroupMessageSeen
from app.services.websocket_manager import manager

router = APIRouter();

@router.patch("/pin")
async def pin_message_(
    request: PinMessageRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):
    return await pin_message(db, request.message_id, request.group_id, current_user.id)

@router.patch("/unpin")
async def unpin_message_(
    request: PinMessageRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):
    return await unpin_message(db, request.message_id, request.group_id, current_user.id)

@router.post("/reaction")
async def toggle_reaction(
    request: ReactionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await add_or_update_reaction(
        db=db,
        message_id=request.message_id,
        user_id=current_user.id,
        reaction=request.reaction.value
    )

    chat_id = f"group_{request.group_id}"

    payload = {
        "action": "message_reaction",
        "group_id": request.group_id,
        "message_id": request.message_id,
        "user_id": current_user.id,
        "reaction": result["reaction"],
        "status": result["status"],
        "reaction_summary": result["reaction_summary"],
        "my_reaction": result["my_reaction"]
    }

    await manager.broadcast(chat_id, payload)

    return {
        "message_id": request.message_id,
        "group_id": request.group_id,
        "reaction": result["reaction"],
        "status": result["status"]
    }

@router.put("/{message_id}", response_model=GroupMessageResponse)
async def update_message_by_id(message_id: int, 
                         message_data: GroupMessageUpdate,
                         db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)
                         ):
    return await update_message(db, message_id, message_data, current_user.id)

@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message_by_id(message_id: int,
                         db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    return await delete_message(db, message_id, current_user.id)

@router.post("/groups/{group_id}", response_model=GroupMessageResponse)
async def upload_file_message_by_id(group_id: int,
                        file: UploadFile = File(...),
                        temp_id: str = Form(...),
                        parent_message_id: int | None = Form(None),
                        db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)
                        ):
    
    return await upload_file_message(db, group_id, file, current_user.id, temp_id, parent_message_id)

@router.put("/{message_id}/file", response_model=GroupMessageResponse)
async def update_file_message_by_id(
    message_id: int,
    file: UploadFile = File(...),
    temp_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await update_file_message(db, message_id, file, current_user.id, temp_id)

@router.post("/groups/{group_id}/voice", response_model=GroupMessageResponse)
async def upload_voice_message_(group_id: int,
                          file: UploadFile = File(...),
                          temp_id: str = Form(...),
                          parent_message_id: int | None = Form(None),
                        #   duration: float = Form(...),
                          db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)
                          ):
    return await upload_voice_message(group_id, file, db, current_user.id, temp_id, parent_message_id)

@router.delete("/{message_id}/voice", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice_message_by_id(message_id: int,
                                     db: Session = Depends(get_db),
                                     current_user: User = Depends(get_current_user)
                                     ):
    return await delete_voice_message(message_id, db, current_user.id)