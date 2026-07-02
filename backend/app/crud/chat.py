from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.private_message import MessageType, PrivateMessage
from app.models.group_message import GroupMessage
from app.models.group_message_reply import GroupMessageReply
from app.models.group_member import GroupMember
from app.models.group_message_reaction import GroupMessageReaction
from app.models.message_reaction import MessageReaction
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException,status
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from app.schemas.chat import MessageCreate
from app.crud.friend import get_friends
import asyncio
from collections import defaultdict

from app.models.user import User
from sqlalchemy import or_, and_
from app.crud.group import get_user_groups
from app.schemas.chat import (MessageOut,ReplyPreview)
from app.services.websocket_manager import manager
from app.crud.group import get_group_members
from app.models.group import Group
from app.helpers.to_utc_iso import to_local_iso
from sqlalchemy import func, and_
from app.models.group_message_seen import GroupMessageSeen
from app.crud.user import get_by_id
from app.utils.chat_helpers import _chat_id

def to_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

async def create_call_message(db, content: str, message_type: str, sender_id: int, receiver_id: int, extra_data: dict | None = None):
    
    chat_id = _chat_id(sender_id, receiver_id)
    
    online_users = manager.get_online_users_in_chat(chat_id)
    online_users.discard(sender_id)
    
    is_online = len(online_users) > 0
    
    try:
        msg = PrivateMessage(
            content=content,
            message_type=message_type,
            sender_id=sender_id,
            receiver_id=receiver_id,
            created_at=datetime.now(timezone.utc),
            extra_data=extra_data or {}
        )

        db.add(msg)
        db.commit()
        db.refresh(msg)
    except Exception as e:
        db.rollback()
        print(f"[DB Error] {e}")
        raise Exception("Failed to save message")
    
    payload = {
        "type": "message",
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_username": msg.sender.username,
        "avatar_url": msg.sender.avatar_url or "",
        "receiver_id": msg.receiver_id,
        "content": msg.content,
        "message_type": msg.message_type.value,
        "created_at": msg.created_at.isoformat(),
        "is_read": is_online
    }
    
    await manager.broadcast(chat_id, payload)
    
    try:
        await broadcast_private_chat_list_update(db, sender_id, receiver_id, msg)
    except Exception as e:
        print(f"[chat list broadcast error] {repr(e)}")
        
    if is_online:
        await mark_message_as_read(db, receiver_id, sender_id)
    

def create_private_message(
    db: Session,
    sender_id: int,
    receiver_id: int,
    content: str,
    message_type: str = "text",
    reply_to_id: Optional[int] = None,
    is_forwarded: bool = False,
    original_sender: Optional[str] = None,
    original_sender_avatar: Optional[str] = None,
    voice_duration: Optional[float] = None,
    file_size: Optional[int] = None,
    forwarded_from_id=None
) -> PrivateMessage:
    try:
        
        try:
            msg_type_enum = MessageType(message_type)
        except ValueError:
            msg_type_enum = MessageType.text

        msg = PrivateMessage(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            message_type=msg_type_enum,
            reply_to_id=reply_to_id,
            is_forwarded=is_forwarded,
            original_sender=original_sender,
            original_sender_avatar=original_sender_avatar,
            voice_duration=voice_duration if msg_type_enum == MessageType.voice else None,
            file_size=file_size if msg_type_enum in [MessageType.voice, MessageType.file] else None,
            created_at=datetime.now(timezone.utc),
            delivered_at=datetime.now(timezone.utc),
            is_read=False,
            forwarded_from_id=forwarded_from_id
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        
        msg = db.query(PrivateMessage).options(
            joinedload(PrivateMessage.sender),
            joinedload(PrivateMessage.receiver),
            joinedload(PrivateMessage.reply_to).joinedload(PrivateMessage.sender)
        ).filter(PrivateMessage.id == msg.id).first()
        
        return msg
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create message: {str(e)}"
        )
        
def build_chat_list(db: Session, current_user: User):
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

        updated_at = to_utc(
            last_msg.created_at if last_msg else friend.created_at
        )

        chats.append({
            "id": friend.id,
            "type": "private",
            "name": friend.username,
            "avatar": friend.avatar_url,
            "last_message": last_msg.content if last_msg else None,
            "updated_at": updated_at
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
        
        creator_info = {
            "id": group.creator.id,
            "username": group.creator.username,
            "avatar_url": group.creator.avatar_url
        } if group.creator else None

        chats.append({
            "id": group.id,
            "type": "group",
            "name": group.name,
            "avatar": group.images[0].url if group.images else None,
            "last_message": last_msg.content if last_msg else None,
            "updated_at": updated_at,
            "creator": creator_info
        })

    chats.sort(
        key=lambda x: x["updated_at"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )

    return chats

def get_private_messages(db: Session, user_id: int, friend_id: int, limit: int = 50, offset: int = 0) -> List[PrivateMessage]:
    return db.query(PrivateMessage).options(
        joinedload(PrivateMessage.sender),
        joinedload(PrivateMessage.receiver),
    ).filter(
        ((PrivateMessage.sender_id == user_id) & (PrivateMessage.receiver_id == friend_id)) |
        ((PrivateMessage.sender_id == friend_id) & (PrivateMessage.receiver_id == user_id))
    ).order_by(PrivateMessage.created_at.desc()).offset(offset).limit(limit).all()

def create_group_message(
    db: Session, 
    sender_id: int, 
    group_id: int, 
    content: str, 
    message_type: MessageType = MessageType.text
) -> GroupMessage:
    
    msg = GroupMessage(
        sender_id=sender_id, 
        group_id=group_id, 
        content=content, 
        message_type= message_type,
        created_at=datetime.utcnow()
    )
    try:
        db.add(msg)
        db.commit()
        db.refresh(msg)
        
    except Exception as e:
        db.rollback()
    
    return msg

def get_group_messages(
    db: Session,
    group_id: int,
    user_id: int,
    limit=50,
    offset=0,
    exclude_text=False,
):
    query = (
        db.query(GroupMessage)
        .filter(GroupMessage.group_id == group_id)
        .options(
            joinedload(GroupMessage.sender),
            joinedload(GroupMessage.replies).joinedload(GroupMessageReply.sender),
            joinedload(GroupMessage.parent_message).joinedload(GroupMessage.sender)
        )
    )

    if exclude_text:
        query = query.filter(GroupMessage.message_type != "text")

    messages = (
        query
        .order_by(GroupMessage.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    message_ids = [m.id for m in messages]

    user_reactions = db.query(GroupMessageReaction).filter(
        GroupMessageReaction.message_id.in_(message_ids),
        GroupMessageReaction.user_id == user_id
    ).all()

    reaction_map = {r.message_id: r.reaction for r in user_reactions}

    for msg in messages:
        msg.my_reaction = reaction_map.get(msg.id)
        msg.reaction_summary = msg.reaction_summary or {}

    return messages
        
def edit_private_message(db: Session, message_id: int, user_id: int, new_content: str) -> PrivateMessage:
    try:
        if not new_content or not new_content.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message content cannot be empty.")

        msg = db.query(PrivateMessage).options(
            joinedload(PrivateMessage.sender),
            joinedload(PrivateMessage.receiver),
        ).filter(
            PrivateMessage.id == message_id,
            PrivateMessage.sender_id == user_id
        ).first()

        if not msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or you don't have permission to edit it."
            )

        msg.content = new_content.strip()
        msg.edited_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(msg)
        
        return msg
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except SQLAlchemyError as e:
        # Rollback on database errors
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while editing message: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error while editing message: {str(e)}"
        )
    
def delete_message_forever(db: Session, message_id: int, user_id: int) -> dict:
    msg = db.query(PrivateMessage).options(
        joinedload(PrivateMessage.seen_statuses)
    ).filter(
        PrivateMessage.id == message_id,
        PrivateMessage.sender_id == user_id
    ).first()

    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or you are not the sender",
        )

    receiver_id = msg.receiver_id

    # Delete seen statuses first
    if msg.seen_statuses:
        for seen_status in msg.seen_statuses:
            db.delete(seen_status)

    # Then delete the message
    db.delete(msg)
    db.commit()

    return {"message_id": message_id, "receiver_id": receiver_id}

def serialize_message_type(message_type: MessageType | None) -> str:
    return message_type.value if message_type else MessageType.text.value


def build_reply_preview(reply: PrivateMessage) -> ReplyPreview:
    if reply.message_type == MessageType.voice:
        content = "Voice message"

    elif reply.message_type == MessageType.image:
        content = "Photo"

    elif reply.message_type == MessageType.video:
        content = "Video"

    elif reply.message_type == MessageType.file:
        content = "File"

    elif reply.message_type == MessageType.text:
        content = reply.content or "Message"
        if len(content) > 100:
            content = content[:100] + "..."

    else:
        content = "Attachment"

    return ReplyPreview(
        id=reply.id,
        sender_id=reply.sender_id,
        sender_username=reply.sender.username if reply.sender else "Unknown",
        content=content,
        message_type=serialize_message_type(reply.message_type),
        voice_duration=reply.voice_duration,
        file_size=reply.file_size
    )

def build_message_out(
    msg: PrivateMessage,
    reply_to: MessageOut | None,
    current_user_id: int = None,
) -> MessageOut:

    my_reaction = None
    if current_user_id:
        my_reaction = next(
            (r.emoji for r in msg.reactions if r.user_id == current_user_id),
            None
        )

    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        content=msg.content or "",
        message_type=serialize_message_type(msg.message_type),

        is_read=msg.is_read,
        read_at=msg.read_at.isoformat() if msg.read_at else None,
        delivered_at=msg.delivered_at.isoformat() if msg.delivered_at else None,

        reply_to_id=msg.reply_to_id,
        reply_to=reply_to,

        is_forwarded=msg.is_forwarded,
        forwarded_from_id=msg.forwarded_from_id,
        original_sender=msg.original_sender,
        original_sender_avatar=msg.original_sender_avatar,

        created_at=msg.created_at.isoformat(),
        edited_at=msg.edited_at.isoformat() if msg.edited_at else None,

        sender_username=getattr(msg.sender, "username", None),
        receiver_username=getattr(msg.receiver, "username", None),

        voice_duration=msg.voice_duration,
        file_size=msg.file_size,

        reactions=build_reactions(msg.reactions),
        my_reaction=my_reaction,
    )

async def auto_end_call(chat_id: str, db):
    
    await asyncio.sleep(30)

    total = manager.get_total_accepted(chat_id)

    if total < 1:
        await manager.end_group_call(chat_id, db)

    manager.call_timers.pop(chat_id, None)
    
async def send_heartbeat(current_user: int):
            try:
                while True:
                    await asyncio.sleep(25)
                    try:
                        await manager.send_json({
                            "type": "ping",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        await manager.update_user_activity(current_user.id)
                    except Exception:
                        break
            except asyncio.CancelledError:
                raise
            except Exception as e:
                print(f"Heartbeat error: {e}")
                
async def mark_message_as_read(db: Session, user_id: int, chat_id: int):
    unread_messages = db.query(PrivateMessage).filter(
        PrivateMessage.receiver_id == user_id,
        PrivateMessage.sender_id == chat_id,
        PrivateMessage.is_read == False
    ).all()
    
    now = datetime.utcnow()
    message_ids = []

    for m in unread_messages:
        m.is_read = True
        m.read_at = now
        message_ids.append(m.id)
        
    db.commit()

    await manager.send_to_user(
        chat_id,
        {
            "type": "messages_read",
            "message_ids": message_ids,
            "reader_id": user_id
        }
    )
    
async def toggle_pin(db: Session, message_id: int, user_id: int):
    message = db.query(PrivateMessage).filter_by(id=message_id).first()

    if not message:
        return {"error": "Message not found"}

    if user_id not in [message.sender_id, message.receiver_id]:
        return {"error": "Not authorized"}

    friend_id = (
        message.receiver_id if message.sender_id == user_id
        else message.sender_id
    )

    chat_id = f"private_{min(user_id, friend_id)}_{max(user_id, friend_id)}"

    if message.is_pinned and message.pinned_by == user_id:
        message.is_pinned = False
        message.pinned_by = None
        message.pinned_at = None
        db.commit()

        await manager.broadcast(chat_id, {
            "type": "message_unpinned",
            "id": message_id,
        })

        return {"status": "unpinned"}

    message.is_pinned = True
    message.pinned_by = user_id
    message.pinned_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(message)

    sender = message.sender
    pinned_by_user = message.pinned_by_user

    payload = {
        "type": "message_pinned",
        "id": message.id,
        "content": message.content,
        "message_type": message.message_type.value,
        "sender": {
            "id": sender.id,
            "username": sender.username,
            "avatar_url": sender.avatar_url,
        } if sender else None,
        "pinned_at": message.pinned_at.isoformat(),
        "pinned_by_user": {
            "id": pinned_by_user.id,
            "username": pinned_by_user.username,
            "avatar_url": pinned_by_user.avatar_url,
        } if pinned_by_user else None,
    }

    await manager.broadcast(chat_id, payload)

    return {"status": "pinned"}

def get_pinned_message(db: Session, user_id: int, current_user_id: int):
    if current_user_id == user_id:
        raise HTTPException(status_code=400, detail="Invalid conversation")

    message = db.query(PrivateMessage).filter(
        (
            (PrivateMessage.sender_id == current_user_id) &
            (PrivateMessage.receiver_id == user_id)
        ) |
        (
            (PrivateMessage.sender_id == user_id) &
            (PrivateMessage.receiver_id == current_user_id)
        ),
        PrivateMessage.is_pinned.is_(True)
    ).order_by(PrivateMessage.pinned_at.desc()).first()

    if not message:
        return {"message": None}

    sender = message.sender
    pinned_by_user = message.pinned_by_user

    return {
        "id": message.id,
        "content": message.content,
        "message_type": message.message_type.value,
        "sender": {
            "id": sender.id,
            "username": sender.username,
            "avatar_url": sender.avatar_url,
        } if sender else None,

        "pinned_at": message.pinned_at,

        "pinned_by_user": {
            "id": pinned_by_user.id,
            "username": pinned_by_user.username,
            "avatar_url": pinned_by_user.avatar_url,
        } if pinned_by_user else None,
    }

async def set_reaction(db: Session, message_id: int, user_id: int, emoji: str):
    reaction = db.query(MessageReaction).filter_by(
        message_id=message_id,
        user_id=user_id
    ).first()

    # ✅ TOGGLE LOGIC
    if reaction:
        if reaction.emoji == emoji:
            # same emoji → remove reaction
            db.delete(reaction)
            db.commit()
            action = "removed"
        else:
            # different emoji → update
            reaction.emoji = emoji
            db.commit()
            db.refresh(reaction)
            action = "updated"
    else:
        reaction = MessageReaction(
            message_id=message_id,
            user_id=user_id,
            emoji=emoji
        )
        db.add(reaction)
        db.commit()
        db.refresh(reaction)
        action = "added"

    message = db.query(PrivateMessage).filter_by(id=message_id).first()

    if not message:
        return {"error": "Message not found"}

    friend_id = (
        message.receiver_id if message.sender_id == user_id
        else message.sender_id
    )

    chat_id = f"private_{min(user_id, friend_id)}_{max(user_id, friend_id)}"

    reactions = build_reactions(message.reactions)

    my_reaction = next(
        (r.emoji for r in message.reactions if r.user_id == user_id),
        None
    )

    payload = {
        "type": "reaction_updated",
        "message_id": message_id,
        "reactions": reactions,
        "my_reaction": my_reaction,
        "action": action,
    }

    await manager.broadcast(chat_id, payload)

    return {"status": action}

def build_reactions(reactions):
    if not reactions:
        return []

    grouped = defaultdict(lambda: {"count": 0, "user_ids": []})

    for r in reactions:
        grouped[r.emoji]["count"] += 1
        grouped[r.emoji]["user_ids"].append(r.user_id)

    return [
        {
            "emoji": emoji,
            "count": data["count"],
            "user_ids": data["user_ids"],
        }
        for emoji, data in grouped.items()
    ]
    
async def broadcast_chat_list_update(db, current_user_id, group_id, msg):

    chat_id = f"group_{group_id}"

    group = (
        db.query(Group)
        .options(
            joinedload(Group.images),
            joinedload(Group.creator)
        )
        .filter(Group.id == group_id)
        .first()
    )

    if not group:
        return

    online_users = manager.get_online_users_in_chat(chat_id)

    members = get_group_members(db, group_id, current_user_id)

    for member in members:
        chat_list_update = {
            "type": "chat_list_update",
            "chat": {
                "id": group_id,
                "type": "group",
                "name": group.name,
                "avatar": group.images[0].url if group.images else None,
                "last_message": msg.content or "",
                "last_message_type": msg.message_type.value,
                "updated_at": to_local_iso(
                    msg.created_at,
                    tz_offset_hours=7
                ),
                "increment_unread": (
                    member.id != current_user_id
                    and member.id not in online_users
                )
            }
        }

        try:
            await manager.send_to_user(
                member.id,
                chat_list_update
            )
        except Exception as e:
            print(
                f"[chat_list send error] "
                f"user={member.id}: {e}"
            )
            
async def broadcast_private_chat_list_update(
    db,
    current_user_id: int,
    friend_id: int,
    msg
):
    sender = get_by_id(db, current_user_id)
    friend = get_by_id(db, friend_id)

    if not sender or not friend:
        return

    chat_id = _chat_id(current_user_id, friend_id)
    online_users = manager.get_online_users_in_chat(chat_id)

    sender_payload = {
        "type": "chat_list_update",
        "chat": {
            "id": friend.id,
            "type": "private",
            "name": friend.username,
            "avatar": friend.avatar_url or "",
            "last_message": msg.content or "",
            "last_message_type": msg.message_type.value,
            "updated_at": to_local_iso(
                msg.created_at,
                tz_offset_hours=7
            ),
            "increment_unread": False
        }
    }

    receiver_payload = {
        "type": "chat_list_update",
        "chat": {
            "id": sender.id,
            "type": "private",
            "name": sender.username,
            "avatar": sender.avatar_url or "",
            "last_message": msg.content or "",
            "last_message_type": msg.message_type.value,
            "updated_at": to_local_iso(
                msg.created_at,
                tz_offset_hours=7
            ),
            "increment_unread": (
                friend_id not in online_users
            )
        }
    }

    try:
        await manager.send_to_user(
            current_user_id,
            sender_payload
        )

        await manager.send_to_user(
            friend_id,
            receiver_payload
        )

    except Exception as e:
        print(f"[chat_list send error]: {e}")
            
def get_unread_count(db, current_user_id: int):
    
    private_unread = (
        db.query(func.count(PrivateMessage.id))
        .filter(
            PrivateMessage.receiver_id == current_user_id,
            PrivateMessage.is_read == False
        )
    .scalar()
    )
    
    group_unread = (
        db.query(func.count(GroupMessage.id))
        .outerjoin(
            GroupMessageSeen,
            and_(
                GroupMessageSeen.message_id == GroupMessage.id,
                GroupMessageSeen.user_id == current_user_id
            )
        )
        .filter(
            GroupMessage.sender_id != current_user_id,
            GroupMessageSeen.id.is_(None)
        )
        .scalar()
    )
    
    navbar_badge = private_unread + group_unread
    
    return navbar_badge
    
