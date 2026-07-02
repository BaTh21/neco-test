from app.models.private_message import MessageType, PrivateMessage
from app.models.group_message import GroupMessage, MessageType as GroupMessageType
from app.models.group_member import GroupMember
from sqlalchemy.orm import Session
from app.crud.chat import create_private_message
from app.models.user import User
from datetime import datetime
from app.helpers.to_utc_iso import to_local_iso
from app.crud.friend import is_friend
from app.core.cloudinary import extract_public_id_from_url
from app.core.config import settings
from livekit.api import AccessToken, VideoGrants
import json
from app.crud.chat import broadcast_private_chat_list_update, broadcast_chat_list_update
from app.core.database import get_db
from app.crud.chat import create_call_message
from app.crud.message import create_new_message
import asyncio
from app.services.websocket_manager import manager

def is_group_member(db: Session, group_id: int, user_id: int) -> bool:
    return db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first() is not None
    
def normalize_private_payload(original, source: str) -> dict:
    msg_type = original.message_type.value

    if msg_type == MessageType.text.value:
        return {
            "content": original.content or ""
        }

    if source == "group":
        if msg_type in (
            MessageType.image.value,
            MessageType.file.value,
            MessageType.voice.value,
        ):
            return {
                "content": (
                    getattr(original, "file_url", None)
                    or getattr(original, "voice_url", None)
                    or original.content
                    or ""
                ),
                "voice_duration": getattr(original, "voice_duration", None),
                "file_size": getattr(original, "file_size", None),
            }

    return {
        "content": original.content or "",
        "voice_duration": getattr(original, "voice_duration", None),
        "file_size": getattr(original, "file_size", None),
    }

async def forward_message(
    db: Session,
    current_user: User,
    source: str,  # 'private' or 'group'
    message_id: int,
    target_user_ids: list[int],
    target_group_ids: list[int],
):
    forwarded = {"users": [], "groups": []}

    # Fetch original message
    original = (
        db.query(PrivateMessage).filter(PrivateMessage.id == message_id).first()
        if source == "private"
        else db.query(GroupMessage).filter(GroupMessage.id == message_id).first()
    )
    if not original:
        raise Exception("Original message not found")

    original_sender = db.query(User).filter(User.id == original.sender_id).first()
    payload = normalize_private_payload(original, source)

    # ---------- Forward to private users ----------
    for uid in target_user_ids:
        if uid == current_user.id or not is_friend(db, current_user.id, uid):
            continue

        msg = create_private_message(
            db=db,
            sender_id=current_user.id,
            receiver_id=uid,
            message_type=MessageType(original.message_type.value),
            is_forwarded=True,
            forwarded_from_id=original.sender_id,
            original_sender=original_sender.username if original_sender else None,
            original_sender_avatar=original_sender.avatar_url if original_sender else None,
            **payload
        )

        forwarded["users"].append((
            uid,
            {
                "type": "message",
                "id": msg.id,
                "content": msg.content,
                "message_type": msg.message_type.value,
                "is_forwarded": True,
                "forwarded_from_id": original.sender_id,
                "original_sender": original_sender.username if original_sender else None,
                "original_sender_avatar": original_sender.avatar_url if original_sender else None,
                "sender": {
                    "id": current_user.id,
                    "username": current_user.username,
                    "avatar_url": current_user.avatar_url,
                },
                "sender_id": current_user.id,
                "sender_username": current_user.username,
                "sender_avatar_url": current_user.avatar_url,
                "receiver_id": uid,
                "receiver_username": original_sender.username if original_sender else None,
                "created_at": to_local_iso(msg.created_at, 7),
                "file_size": payload.get("file_size"),
                "voice_duration": payload.get("voice_duration"),
            }
        ))
        
        try:
            await broadcast_private_chat_list_update(db, current_user.id, uid, msg)
        except Exception as e:
            print(f"[chat list broadcast error] {repr(e)}")

    # ---------- Forward to groups ----------
    for gid in target_group_ids:
        if not is_group_member(db, gid, current_user.id):
            continue

        new_msg = GroupMessage(
            group_id=gid,
            sender_id=current_user.id,
            forwarded_by_id=current_user.id,
            forwarded_at=datetime.utcnow(),
            message_type=GroupMessageType(original.message_type.value),
        )

        # Assign content / media using normalized payload
        msg_type_value = original.message_type.value

        if msg_type_value == "text":
            new_msg.content = payload.get("content")

        elif msg_type_value in ("image", "file", "video"):
            new_msg.file_url = payload.get("content")
            new_msg.file_size = payload.get("file_size")
            new_msg.public_id = (
                extract_public_id_from_url(new_msg.file_url)
                if new_msg.file_url else None
            )

        elif msg_type_value == "voice":
            new_msg.voice_url = payload.get("content")
            new_msg.voice_duration = payload.get("voice_duration")
            new_msg.voice_public_id = (
                extract_public_id_from_url(new_msg.voice_url)
                if new_msg.voice_url else None
            )

        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)

        forwarded["groups"].append((
            gid,
            {
                "action": "new_message",
                "id": new_msg.id,
                "group_id": gid,
                "message_type": new_msg.message_type.value,
                "content": new_msg.content,
                "file_url": new_msg.file_url,
                "voice_url": new_msg.voice_url,
                "sender": {
                    "id": current_user.id,
                    "username": current_user.username,
                    "avatar_url": current_user.avatar_url,
                },
                "forwarded_by": {
                    "id": current_user.id,
                    "username": current_user.username,
                    "avatar_url": current_user.avatar_url,
                },
                "original_sender": {
                    "id": original_sender.id if original_sender else None,
                    "username": original_sender.username if original_sender else None,
                    "avatar_url": original_sender.avatar_url if original_sender else None,
                },
                "created_at": to_local_iso(new_msg.created_at, 7),
                "file_size": payload.get("file_size"),
                "voice_duration": payload.get("voice_duration"),
            }
        ))
        
        try:
            await broadcast_chat_list_update(db, current_user.id, gid, new_msg)
        except Exception as e:
            print(f"[chat list broadcast error] {repr(e)}")

    return forwarded

def create_livekit_token(
    user_id: int,
    username: str,
    avatar_url: str | None,
    room: str
):
    token = AccessToken(
        settings.LIVEKIT_API_KEY,
        settings.LIVEKIT_API_SECRET,
    )

    token = token.with_identity(str(user_id))
    
    token = token.with_name(username)

    token = token.with_metadata(json.dumps({
        "user_id": user_id,
        "username": username,
        "avatar_url": avatar_url or "",
    }))

    token = token.with_grants(
        VideoGrants(
            room_join=True,
            room=room,
            can_publish=True,
            can_subscribe=True,
        )
    )

    return token.to_jwt()

async def handle_call_timeout(room: str):
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        await asyncio.sleep(30)

        call = manager.active_calls.get(room)

        if not call:
            return

        if call["status"] != "ringing":
            return

        caller_id = call["caller_id"]
        participants = list(call["participants"])

        for uid in participants:
            await manager.send_to_user(uid, {
                "type": "call_timeout",
                "room": room
            })
            
        is_group = room.startswith("group_")

        if is_group:
            try:
                group_id = int(room.split("_")[1])
            except Exception:
                await manager.end_call(room)
                return

            await create_new_message(
                db=db,
                content="Missed group call",
                message_type="system",
                current_user_id=caller_id,
                group_id=group_id,
                extra_data={
                    "call_event": "missed",
                    "call_initiator_id": caller_id,
                    "participants": participants,
                    "call_type": call["call_type"],
                }
            )

        else:
            receiver_id = next(
                (uid for uid in participants if uid != caller_id),
                None
            )

            await create_call_message(
                db=db,
                content="Missed call",
                message_type="system",
                sender_id=caller_id,
                receiver_id=receiver_id,
                extra_data={
                    "call_event": "missed",
                    "call_initiator_id": caller_id,
                    "call_type": call["call_type"],
                }
            )


        await manager.end_call(room)
    finally:
        db.close()
        db_gen.close()
