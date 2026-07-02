# app/api/v1/routers/groups.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.group import GroupCreate, GroupInviteOut, GroupMessageCreate, GroupOut, GroupUpdate, GroupInviteResponse, GroupImageResponse, GroupDetailsOut
from app.services.websocket_manager import manager
from app.crud.group import (
    accept_group_invite, add_member, create_group_with_invites, get_group_diaries, get_group_members, get_pending_invites, get_user_groups, get_group, remove_member,
    leave_group, update_group, invite_user, delete_group_invite, delete_cover, get_group_covers, delete_group,
    get_or_create_invite_link, upload_group_cover, exists_member  # Added exists_member
)
from app.schemas.diary import DiaryOut
from app.schemas.user import UserOut
from app.crud.chat import get_group_messages
from app.models.group_message import GroupMessage
from app.schemas.chat import GroupMessageOut
from app.models.group_invite import GroupInvite
from app.crud.message import mark_all_as_read

router = APIRouter()

# CREATE GROUP
@router.post("/", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_group_with_invites(db, group_in, current_user.id)

@router.get("/my", response_model=List[GroupOut])
def list_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    groups = get_user_groups(db, current_user.id)
    return groups

@router.get("/{group_id}", response_model=GroupDetailsOut)
def get_group_by_id(group_id: int, db: Session = Depends(get_db)):
    group, pinned_message = get_group(db, group_id)

    return {
    "id": group.id,
    "name": group.name,
    "creator_id": group.creator_id,
    "description": group.description,
    "created_at": group.created_at,
    "images": group.images,
    "pinned_message": (
        {
            "id": pinned_message.id,
            "content": pinned_message.content,
            "message_type": pinned_message.message_type,
            "sender_id": pinned_message.sender_id,
            "pinned_by_id": pinned_message.pinned_by_id,
            "pinned_by": pinned_message.pinned_by.username,
            "pinned_at": pinned_message.pinned_at,
        }
        if pinned_message else None
    ),
}

@router.patch("/{group_id}", response_model=GroupOut)
def update_by_id(group_id: int,
                 group_data: GroupUpdate,
                 db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)
                 ):
    return update_group(group_id, db, group_data, current_user.id)

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group_by_id(group_id: int,
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)
                       ):
    return delete_group(db, group_id, current_user.id)

@router.post("/{group_id}/join")
def join_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if exists_member(db, group_id, current_user.id):
        raise HTTPException(400, "Already a member")
    add_member(db, group_id, current_user.id)
    return {"msg": "Joined group"}

@router.get("/{group_id}/message", response_model=List[GroupMessageOut])
async def get_group_messages_(
    group_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    exclude_text: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    if not exists_member(db, group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this group")

    messages = get_group_messages(
        db,
        group_id,
        current_user.id,
        limit,
        offset,
        exclude_text
    )

    message_ids, now = await mark_all_as_read(db, group_id, current_user.id)

    if message_ids:
        payload = {
            "action": "messages_read",
            "group_id": group_id,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "avatar_url": current_user.avatar_url,
            },
            "message_ids": message_ids,
            "seen_at": now.isoformat(),
        }

        chat_id = f"group_{group_id}"

        try:
            await manager.broadcast(chat_id, payload)
        except Exception as e:
            print(f"[Broadcast Error]: {e}")

    return messages or []

@router.post("/{token}/accept")
def accept_invite(token: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return accept_group_invite(db, token, current_user.id)
   
@router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invite_by_id(invite_id: int, db: Session = Depends(get_db)):
    return delete_group_invite(db, invite_id)

@router.get("/{group_id}/invite-link")
def get_invite_link(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        link = get_or_create_invite_link(db, group_id, current_user.id)
        return {"invite_link": link}
    except HTTPException as e:
        raise e
    except:
        raise HTTPException(500, "Failed to generate link")

@router.get("/{group_id}/members/", response_model=List[UserOut])
def get_group_members_endpoint(
    group_id: int,
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_group_members(db, group_id, current_user.id, search)

@router.get("/{group_id}/diaries/", response_model=List[DiaryOut])
def get_group_diaries_endpoint(
    group_id: int,
    search: Optional[str] = Query(None, description="Search by title or content"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_group_diaries(db, group_id, current_user.id, search)

@router.get("/invites/pending", response_model=List[GroupInviteResponse])
def get_pending_invites_(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_pending_invites(db, current_user.id)

@router.post("/invites/{invite_id}/accept")
def accept_invite_by_id(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return accept_group_invite(db, invite_id, current_user.id)

@router.post("/{group_id}/invites/{user_id}", response_model=GroupInviteResponse)
def invite_user_by_id(group_id: int,
                      user_id: int,
                      db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)
                      ):
    return invite_user(group_id, user_id, db, current_user)

@router.delete("/remove/{group_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_by_id(group_id: int,
                        member_id: int,
                        db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    return remove_member(group_id, member_id, db, current_user.id)

@router.delete("/leave/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def leave_group_by_id(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return leave_group(group_id, db, current_user.id)

@router.post("/{group_id}/cover", response_model=GroupImageResponse)
async def upload_cover_by_id(group_id: int,
                       db: Session = Depends(get_db),
                       cover: UploadFile = File(...),
                       current_user: User = Depends(get_current_user)):
    return await upload_group_cover(group_id, db, cover, current_user.id)

@router.delete("/cover/{cover_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cover_by_id(cover_id: int,
                             db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_user)
                             ):
    return await delete_cover(cover_id, db, current_user.id)

@router.get("/{group_id}/cover", response_model=List[GroupImageResponse])
def get_cover(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_group_covers(group_id, db)