import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud.chat import create_private_message, edit_private_message, build_reply_preview, build_message_out, mark_message_as_read, toggle_pin, set_reaction, get_pinned_message, build_reactions, get_unread_count
from app.crud.friend import is_blocked, is_blocked_by, is_friend
from app.models.private_message import MessageType, PrivateMessage
from app.models.user import User
from app.schemas.chat import (MarkMessagesAsReadRequest, MarkMessagesAsReadResponse, ChatListItem,
                             MessageCreate, MessageOut, MessageSeenByUser, ReplyPreview, ReactionRequest)
from app.services.websocket_manager import manager
from app.utils.chat_helpers import _chat_id, extract_public_id_from_url
from app.core.cloudinary import upload_voice_message
from app.core.config import settings
from app.crud.friend import get_friends
from sqlalchemy import or_, and_, func
from app.crud.group import get_user_groups
from app.models.group_message import GroupMessage
from app.models.message_reaction import MessageReaction
from datetime import timezone
from sqlalchemy.orm import selectinload
from app.models.group_message_seen import GroupMessageSeen
from app.crud.chat import broadcast_private_chat_list_update

router = APIRouter()

def to_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

@router.get("/", response_model=list[ChatListItem])
def list_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    chats = []

    friends = get_friends(db, current_user.id)

    for friend in friends:
        last_msg = (
            db.query(PrivateMessage)
            .filter(
                or_(
                    and_(
                        PrivateMessage.sender_id == current_user.id,
                        PrivateMessage.receiver_id == friend.id
                    ),
                    and_(
                        PrivateMessage.sender_id == friend.id,
                        PrivateMessage.receiver_id == current_user.id
                    )
                )
            )
            .order_by(PrivateMessage.created_at.desc())
            .first()
        )
        
        unread_count = (
            db.query(PrivateMessage)
            .filter(
                PrivateMessage.sender_id == friend.id,
                PrivateMessage.receiver_id == current_user.id,
                PrivateMessage.is_read == False
            )
            .count()
        )

        updated_at = to_utc(
            last_msg.created_at if last_msg else friend.created_at
        )

        chats.append({
            "id": friend.id,
            "type": "private",
            "name": friend.username,
            "avatar": friend.avatar_url,
            "last_message": last_msg.content if last_msg else None,
            "last_message_type": last_msg.message_type.value if last_msg else None,
            "updated_at": updated_at,
            "unread_count": unread_count
        })

    groups = get_user_groups(db, current_user.id)

    for group in groups:
        last_msg = (
            db.query(GroupMessage)
            .filter(GroupMessage.group_id == group.id)
            .order_by(GroupMessage.created_at.desc())
            .first()
        )

        updated_at = to_utc(
            last_msg.created_at if last_msg else group.created_at
        )
        
        unread_count = (
            db.query(func.count(GroupMessage.id))
            .outerjoin(
                GroupMessageSeen,
                and_(
                    GroupMessageSeen.message_id == GroupMessage.id,
                    GroupMessageSeen.user_id == current_user.id
                )
            )
            .filter(
                GroupMessage.group_id == group.id,
                GroupMessage.sender_id != current_user.id,
                GroupMessageSeen.id.is_(None)
            )
            .scalar()
        )

        chats.append({
            "id": group.id,
            "type": "group",
            "name": group.name,
            "avatar": group.images[0].url if group.images else None,
            "last_message": last_msg.content if last_msg else None,
            "last_message_type": last_msg.message_type.value if last_msg else None,
            "updated_at": updated_at,
            "unread_count": unread_count
        })

    chats.sort(
        key=lambda x: x["updated_at"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )

    return chats[offset: offset + limit]

@router.get("/unread-count")
def get_unread_count_(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):
    return get_unread_count(db, current_user.id)

@router.get("/private/{friend_id}", response_model=List[MessageOut])
async def get_private_chat(
    friend_id: int,
    limit: int = 30,
    offset: int = 0,
    exclude_text: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if is_blocked(db, current_user.id, friend_id) or is_blocked_by(db, current_user.id, friend_id):
        return []

    if not is_friend(db, current_user.id, friend_id):
        raise HTTPException(status_code=403, detail="Not friends")

    updated_count = db.query(PrivateMessage).filter(
        PrivateMessage.sender_id == friend_id,
        PrivateMessage.receiver_id == current_user.id,
        PrivateMessage.is_read == False
    ).update(
        {
            PrivateMessage.is_read: True,
            PrivateMessage.read_at: datetime.utcnow()
        },
        synchronize_session=False
    )

    db.commit()
    
    if updated_count > 0:
        await manager.send_to_user(
            friend_id,
            {
                "type": "chat_read",
                "reader_id": current_user.id,
                "chat_with": friend_id
            }
        )

    query = (
        db.query(PrivateMessage)
        .options(
            joinedload(PrivateMessage.sender),
            joinedload(PrivateMessage.receiver),
            joinedload(PrivateMessage.reply_to).joinedload(PrivateMessage.sender),
            joinedload(PrivateMessage.reply_to).joinedload(PrivateMessage.receiver),
            selectinload(PrivateMessage.reactions),
        )
        .filter(
            ((PrivateMessage.sender_id == current_user.id) & (PrivateMessage.receiver_id == friend_id)) |
            ((PrivateMessage.sender_id == friend_id) & (PrivateMessage.receiver_id == current_user.id))
        )
    )
    
    if exclude_text:
        query = query.filter(PrivateMessage.message_type != "text")
        
    messages = (
        query
        .order_by(PrivateMessage.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    result: list[MessageOut] = []

    for msg in messages:

        reply_to_out = None

        if msg.reply_to:
            reply_to_out = build_reply_preview(msg.reply_to)

        result.append(
            build_message_out(
                msg=msg,
                reply_to=reply_to_out,
                current_user_id=current_user.id
            )
        )

    return result  

@router.post("/private/{friend_id}/voice", response_model=MessageOut)
async def send_voice_message(
    friend_id: int,
    voice_file: UploadFile = File(...),
    duration: float = Form(...),
    reply_to_id: Optional[int] = Form(None),
    temp_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:

        if not is_friend(db, current_user.id, friend_id):
            raise HTTPException(status_code=403, detail="Not friends")

        contents = await voice_file.read()
        file_size = len(contents)

        if file_size == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
        if file_size > 15 * 1024 * 1024:  # 15MB max
            raise HTTPException(status_code=400, detail="Voice message too large (max 15MB)")

        if duration <= 0 or duration > 600:  # max 10 minutes
            raise HTTPException(status_code=400, detail="Invalid voice duration")

        try:
            upload_result = upload_voice_message(
                file_content=contents,
                public_id=f"voice_{current_user.id}_{uuid.uuid4().hex[:8]}",  # shorter ID
                folder="voice_messages"
            )
            voice_url = upload_result["secure_url"]
            
        except Exception as upload_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to upload voice message: {str(upload_error)}"
            )

        try:
            msg = create_private_message(
                db=db,
                sender_id=current_user.id,
                receiver_id=friend_id,
                content=voice_url,
                message_type="voice",
                reply_to_id=reply_to_id,
                voice_duration=round(duration, 2),
                file_size=file_size
            )
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to save message to database")

        full_msg = db.query(PrivateMessage).options(
            joinedload(PrivateMessage.sender),
            joinedload(PrivateMessage.receiver),
            joinedload(PrivateMessage.reply_to).joinedload(PrivateMessage.sender),
        ).filter(PrivateMessage.id == msg.id).first()

        if not full_msg:
            raise HTTPException(status_code=500, detail="Failed to load sent message")

        chat_id = _chat_id(current_user.id, friend_id)

        broadcast_data = {
            "type": "message",
            "id": full_msg.id,
            "temp_id": temp_id,
            "content": voice_url,
            "message_type": "voice",
            "sender_id": full_msg.sender_id,
            "receiver_id": full_msg.receiver_id,
            "sender_username": full_msg.sender.username,
            "sender_avatar_url": full_msg.sender.avatar_url,
            "receiver_username": full_msg.receiver.username,
            "created_at": full_msg.created_at.isoformat(),
            "is_read": False,
            "voice_duration": round(duration, 2),
            "file_size": file_size,
            "reply_to_id": full_msg.reply_to_id,
            "reply_to": None,
        }

        if full_msg.reply_to:
            reply = full_msg.reply_to
            reply_text = "Voice message"

            if reply.message_type == MessageType.text:
                reply_text = reply.content or "Message"
                if len(reply_text) > 80:
                    reply_text = reply_text[:80] + "..."
            elif reply.message_type == MessageType.image:
                reply_text = "Photo"
            elif reply.message_type == MessageType.file:
                reply_text = "File"

            broadcast_data["reply_to"] = {
                "id": reply.id,
                "sender_username": reply.sender.username,
                "content": reply_text,
                "message_type": reply.message_type.value,
                "voice_duration": reply.voice_duration,
                "file_size": reply.file_size
            }
            
        await manager.broadcast(chat_id, broadcast_data)
        
        try:
            await broadcast_private_chat_list_update(db, current_user.id, friend_id, full_msg)
        except Exception as e:
            print(f"[chat list broadcast error] {repr(e)}")
            
        online_users = manager.get_online_users_in_chat(chat_id)
        online_users.discard(current_user.id)
        
        is_online = len(online_users) > 0
        
        if is_online:
            await mark_message_as_read(db, friend_id, current_user.id)

        return broadcast_data

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Voice message failed: {str(e)}")
    
@router.post("/private/{friend_id}/upload")
async def send_media_message(
    friend_id: int,
    file: UploadFile = File(...),
    message_type: str = Form(default=None),
    reply_to_id: int = Form(default=None),
    temp_id: str = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if message_type and message_type not in ["image", "video", "file"]:
        raise HTTPException(status_code=400, detail="Invalid media type")
    
    try:
        if not is_friend(db, current_user.id, friend_id):
            raise HTTPException(status_code=403, detail="Not friends")

        if not file.content_type:
            raise HTTPException(status_code=400, detail="Invalid file")

        content_type = file.content_type or ""

        if content_type.startswith("image/"):
            detected_type = MessageType.image
            folder = "chat_images"
            resource_type = "image"
        elif content_type.startswith("video/"):
            detected_type = MessageType.video
            folder = "chat_videos"
            resource_type = "video"
        else:
            detected_type = MessageType.file
            folder = "chat_files"
            resource_type = "raw"

        file_extension = file.filename.split('.')[-1] if '.' in file.filename else "bin"
        unique_filename = f"chat_{current_user.id}_{friend_id}_{uuid.uuid4().hex}.{file_extension}"

        upload_result = cloudinary.uploader.upload(
            file.file,
            folder=folder,
            public_id=unique_filename,
            resource_type=resource_type
        )

        file_url = upload_result["secure_url"]

        msg = create_private_message(
            db=db,
            sender_id=current_user.id,
            receiver_id=friend_id,
            content=file_url,
            message_type=detected_type,
            reply_to_id=reply_to_id,
            file_size=upload_result.get("bytes", 0),
            is_forwarded=False,
            original_sender=None
        )

        full_msg = db.query(PrivateMessage).options(
            joinedload(PrivateMessage.sender),
            joinedload(PrivateMessage.receiver),
        ).filter(PrivateMessage.id == msg.id).first()

        chat_id = _chat_id(current_user.id, friend_id)

        reply_to = None
        if full_msg.reply_to_id:
            reply_msg = db.query(PrivateMessage).filter(
                PrivateMessage.id == full_msg.reply_to_id
            ).first()

            if reply_msg:
                reply_to = {
                    "id": reply_msg.id,
                    "content": reply_msg.content,
                    "message_type": reply_msg.message_type.value,
                    "sender_username": reply_msg.sender.username
                }

        broadcast_data = {
            "type": "message",
            "id": full_msg.id,
            "temp_id": temp_id,
            "content": full_msg.content,
            "message_type": full_msg.message_type.value,
            "sender_id": full_msg.sender_id,
            "receiver_id": full_msg.receiver_id,
            "sender_username": full_msg.sender.username,
            "sender_avatar_url": full_msg.sender.avatar_url,
            "receiver_username": full_msg.receiver.username,
            "created_at": full_msg.created_at.isoformat(),
            "is_read": full_msg.is_read,
            "read_at": full_msg.read_at.isoformat() if full_msg.read_at else None,
            "delivered_at": full_msg.delivered_at.isoformat() if full_msg.delivered_at else None,
            "voice_duration": full_msg.voice_duration,
            "file_size": full_msg.file_size,
            "reply_to_id": full_msg.reply_to_id,
            "reply_to": reply_to,
            "is_forwarded": full_msg.is_forwarded,
            "original_sender": full_msg.original_sender,
        }

        await manager.broadcast(chat_id, broadcast_data)
        
        try:
            await broadcast_private_chat_list_update(db, current_user.id, friend_id, full_msg)
        except Exception as e:
            print(f"[chat list broadcast error] {repr(e)}")
        
        online_users = manager.get_online_users_in_chat(chat_id)
        online_users.discard(current_user.id)
        
        is_online = len(online_users) > 0
        if is_online:
            await mark_message_as_read(db, friend_id, current_user.id)

        return broadcast_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
@router.put("/private/{message_id}/replace-file")
async def replace_file_message(
    message_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(PrivateMessage).filter(
        PrivateMessage.id == message_id,
        PrivateMessage.sender_id == current_user.id
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Detect type
    file.file.seek(0)
    content_type = file.content_type or ""
    filename = file.filename.lower()

    if content_type.startswith("image/") or filename.endswith((".jpg", ".jpeg", ".png")):
        resource_type = "image"
        folder = "chat_images"
        msg.message_type = MessageType.image
    elif content_type.startswith("video/") or filename.endswith((".mp4", ".mov")):
        resource_type = "video"
        folder = "chat_videos"
        msg.message_type = MessageType.video
    else:
        resource_type = "raw"
        folder = "chat_files"
        msg.message_type = MessageType.file

    upload_result = cloudinary.uploader.upload(
        file.file,
        folder=folder,
        resource_type=resource_type
    )

    msg.content = upload_result["secure_url"]
    msg.file_size = upload_result.get("bytes", 0)
    msg.edited_at = datetime.utcnow()
    msg.is_edited = True

    db.commit()
    db.refresh(msg)

    chat_id = _chat_id(msg.sender_id, msg.receiver_id)

    await manager.broadcast(chat_id, {
        "type": "message_replaced",
        "message_id": msg.id,
        "new_content": msg.content,
        "file_size": msg.file_size,
        "message_type": msg.message_type.value,
        "edited_at": msg.edited_at.isoformat()
    })
    
    try:
        await broadcast_private_chat_list_update(db, current_user.id, msg.receiver_id, msg)
    except Exception as e:
        print(f"[chat list broadcast error] {repr(e)}")

    return {"success": True}

@router.delete("/private/image/{message_id}")
async def delete_image_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        message = db.query(PrivateMessage).filter(
            PrivateMessage.id == message_id,
            (PrivateMessage.sender_id == current_user.id) | (PrivateMessage.receiver_id == current_user.id)
        ).first()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        if message.sender_id != current_user.id:
            raise HTTPException(status_code=403, detail="Can only delete your own messages")
        
        if message.message_type.value != 'image':
            raise HTTPException(status_code=400, detail="Not an image message")
        
        image_url = message.content
        public_id = extract_public_id_from_url(image_url)
        
        if public_id:
            cloudinary.uploader.destroy(public_id)
        
        chat_id = _chat_id(message.sender_id, message.receiver_id)
        
        db.delete(message)
        db.commit()
        
        await manager.broadcast(chat_id, {
            "type": "message_deleted",
            "message_id": message_id,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"status": "success", "message": "Image message deleted", "message_id": message_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete image message: {str(e)}")

@router.delete("/private/{message_id}")
async def delete_message_forever_endpoint(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    try:
        message = db.query(PrivateMessage).filter(PrivateMessage.id == message_id).first()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        if message.sender_id != current_user.id:
            raise HTTPException(status_code=403, detail="Can only delete your own messages")
        
        chat_id = _chat_id(message.sender_id, message.receiver_id)
        
        if message.message_type.value == 'image':
            image_url = message.content
            public_id = extract_public_id_from_url(image_url)
            
            if public_id:
                cloudinary.uploader.destroy(public_id)
        
        db.delete(message)
        db.commit()

        await manager.broadcast(chat_id, {
            "type": "message_deleted", 
            "message_id": message_id,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "status": "success", 
            "message": "Message deleted successfully",
            "message_id": message_id,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Delete error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")

@router.patch("/private/{message_id}")
async def edit_message(
    message_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        msg = edit_private_message(db, message_id, current_user.id, data.content.strip())

        full_msg = db.query(PrivateMessage).options(
            joinedload(PrivateMessage.sender),
            joinedload(PrivateMessage.receiver),
        ).filter(PrivateMessage.id == msg.id).first()

        if not full_msg:
            raise HTTPException(status_code=404, detail="Message not found after edit")

        chat_id = _chat_id(full_msg.sender_id, full_msg.receiver_id)

        payload = {
            "type": "message_updated", 
            "id": full_msg.id,
            "message_id": full_msg.id,
            "content": full_msg.content,
            "message_type": full_msg.message_type.value,
            "edited_at": full_msg.edited_at.isoformat(),
            "created_at": full_msg.created_at.isoformat(),
            "sender_id": full_msg.sender_id,
            "receiver_id": full_msg.receiver_id,
            "sender_username": full_msg.sender.username,
            "receiver_username": full_msg.receiver.username if full_msg.receiver else None,
            "avatar_url": full_msg.sender.avatar_url,
            "is_read": full_msg.is_read,
            "voice_duration": full_msg.voice_duration,
            "file_size": full_msg.file_size,
            "is_forwarded": full_msg.is_forwarded,
            "original_sender": full_msg.original_sender,
        }

        await manager.broadcast(chat_id, payload)
        
        try:
            await broadcast_private_chat_list_update(db, current_user.id, full_msg.receiver_id, full_msg)
        except Exception as e:
            print(f"[chat list broadcast error] {repr(e)}")
        
        return {
            "id": full_msg.id,
            "content": full_msg.content,
            "edited_at": full_msg.edited_at.isoformat(),
            "message_type": full_msg.message_type.value,
            "edited": True,
            "sender_username": full_msg.sender.username,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to edit message: {str(e)}")

@router.post("/private/{message_id}/pin")
async def pin_message(message_id: int,
                db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    
    return await toggle_pin(db, message_id, current_user.id)

@router.get("/private/{user_id}/pin")
def get_pinned_message_(user_id: int,
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)
                       ):
    return get_pinned_message(db, user_id, current_user.id)

@router.post("/private/reaction")
async def reaction_message(request: ReactionRequest,
                     db: Session = Depends(get_db),
                     current: User = Depends(get_current_user)):
    return await set_reaction(db, request.message_id, current.id, request.emoji)
