from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast
from sqlalchemy.dialects.postgresql import JSONB
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate, ShareNoteRequest
from typing import List, Optional
import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo  
import json

from app.models.user import User

CAMBODIA_TZ = ZoneInfo("Asia/Phnom_Penh")

def cambodia_time() -> datetime:
    """Return current datetime in Cambodia timezone (timezone‑aware)"""
    return datetime.now(CAMBODIA_TZ)


def create_note(db: Session, note: NoteCreate, user_id: int) -> Note:
    now = cambodia_time()
    db_note = Note(
        title=note.title,
        content=note.content,
        user_id=user_id,
        is_pinned=note.is_pinned or False,
        is_archived=note.is_archived or False,
        color=note.color or "#ffffff",
        share_type=str(note.share_type.value) if hasattr(note.share_type, 'value') else str(note.share_type),
        shared_with=note.shared_with or [],
        can_edit=note.can_edit or False,
        created_at=now,
        updated_at=now
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


def get_note_by_id(db: Session, note_id: int, user_id: int) -> Optional[Note]:
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == user_id
    ).first()
    if note:
        return note
    shared_note = (
        db.query(Note)
        .filter(
            Note.id == note_id,
            Note.share_type == "shared",
            Note.shared_with != None,
            cast(Note.shared_with, JSONB).contains([user_id])
        )
        .first()
    )
    return shared_note


def get_notes_by_user(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    archived: bool = False
) -> List[Note]:
    # Own notes
    user_notes = db.query(Note).filter(
        Note.user_id == user_id,
        Note.is_archived == archived
    ).all()

    # Shared with me
    shared_notes = (
        db.query(Note)
        .filter(
            Note.share_type == "shared",
            Note.is_archived == False,
            Note.shared_with != None,
            cast(Note.shared_with, JSONB).contains([user_id])
        )
        .all()
    )

    all_notes = user_notes + shared_notes
    all_notes.sort(
        key=lambda x: (
            x.is_pinned,
            x.updated_at or x.created_at
        ),
        reverse=True
    )
    return all_notes


def get_shared_notes(db: Session, user_id: int) -> List[Note]:
    # Explicitly shared with me
    shared_with_me = (
        db.query(Note)
        .filter(
            Note.share_type == "shared",
            Note.user_id != user_id,
            Note.is_archived == False,
            Note.shared_with != None,
            cast(Note.shared_with, JSONB).contains([user_id])
        )
        .order_by(Note.updated_at.desc())
        .all()
    )

    current_user = db.query(User).filter(User.id == user_id).first()
    friend_ids = []
    if current_user and hasattr(current_user, 'friends') and current_user.friends:
        friend_ids = [friend.id for friend in current_user.friends]

    public_from_friends = []
    if friend_ids:
        public_from_friends = (
            db.query(Note)
            .filter(
                Note.share_type == "public",
                Note.user_id.in_(friend_ids),
                Note.is_archived == False,
                Note.user_id != user_id,
                or_(
                    Note.share_expires.is_(None),
                    Note.share_expires > cambodia_time() 
                )
            )
            .order_by(Note.updated_at.desc())
            .all()
        )

    all_notes = shared_with_me + public_from_friends
    unique_notes = {note.id: note for note in all_notes}
    sorted_notes = sorted(
        unique_notes.values(),
        key=lambda x: x.updated_at or x.created_at,
        reverse=True
    )
    return sorted_notes


def get_friends_public_notes(db: Session, user_id: int) -> List[Note]:
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.friends:
            return []

        friend_ids = [friend.id for friend in user.friends]
        notes = db.query(Note).filter(
            Note.share_type == "public",
            Note.user_id.in_(friend_ids),
            Note.is_archived == False,
            or_(
                Note.share_expires.is_(None),
                Note.share_expires > cambodia_time()
            )
        ).order_by(Note.created_at.desc()).all()
        return notes
    except Exception as e:
        print(f" Error in get_friends_public_notes: {str(e)}")
        return []


def update_note(db: Session, note_id: int, user_id: int, note_update: NoteUpdate) -> Optional[Note]:
    db_note = get_note_by_id(db, note_id, user_id)
    if not db_note:
        return None

    if db_note.user_id == user_id:
        pass
    elif db_note.share_type == "shared" and db_note.can_edit:
        is_shared_with_edit = (
            db.query(Note)
            .filter(
                Note.id == note_id,
                Note.share_type == "shared",
                Note.can_edit == True,
                Note.shared_with != None,
                cast(Note.shared_with, JSONB).contains([user_id])
            )
            .first()
        )
        if not is_shared_with_edit:
            return None
    else:
        return None

    update_data = note_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_note, field, value)

    db.commit()
    db.refresh(db_note)
    return db_note


def delete_note(db: Session, note_id: int, user_id: int) -> bool:
    db_note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == user_id
    ).first()
    if db_note:
        db.delete(db_note)
        db.commit()
        return True
    return False


def toggle_pin_note(db: Session, note_id: int, user_id: int) -> Optional[Note]:
    db_note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == user_id
    ).first()
    if db_note:
        db_note.is_pinned = not db_note.is_pinned
        db.commit()
        db.refresh(db_note)
        return db_note
    return None


def archive_note(db: Session, note_id: int, user_id: int) -> Optional[Note]:
    db_note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == user_id
    ).first()
    if db_note:
        db_note.is_archived = not db_note.is_archived
        db.commit()
        db.refresh(db_note)
        return db_note
    return None


def generate_share_token() -> str:
    return secrets.token_urlsafe(32)


def share_note(db: Session, note_id: int, user_id: int, share_data: ShareNoteRequest) -> Optional[Note]:
    db_note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == user_id
    ).first()
    if not db_note:
        return None

    share_type_value = share_data.share_type.value if hasattr(share_data.share_type, 'value') else share_data.share_type

    db_note.share_type = share_type_value
    db_note.can_edit = share_data.can_edit

    if share_type_value == "public":
        db_note.share_token = generate_share_token()
        db_note.shared_with = []
        if share_data.expires_in_hours:
            db_note.share_expires = cambodia_time() + timedelta(hours=share_data.expires_in_hours)
        else:
            db_note.share_expires = None
    elif share_type_value == "shared":
        db_note.shared_with = share_data.friend_ids or []
        db_note.share_token = None
        db_note.share_expires = None
    else: 
        db_note.shared_with = []
        db_note.share_token = None
        db_note.share_expires = None
        db_note.can_edit = False

    db.commit()
    db.refresh(db_note)
    return db_note


def remove_current_user_from_shared_with(
    db: Session,
    note_id: int,
    current_user_id: int
) -> Optional[Note]:
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note or note.user_id == current_user_id or note.share_type != "shared":
        return None

    shared_users = note.shared_with or []
    if current_user_id not in shared_users:
        return None

    note.shared_with = [uid for uid in shared_users if uid != current_user_id]
    if not note.shared_with:
        note.share_type = "private"
        note.can_edit = False

    db.commit()
    db.refresh(note)
    return note


def get_public_note(db: Session, share_token: str) -> Optional[Note]:
    return db.query(Note).filter(
        Note.share_token == share_token,
        Note.share_type == "public",
        Note.is_archived == False,
        or_(
            Note.share_expires.is_(None),
            Note.share_expires > cambodia_time()
        )
    ).first()


def stop_sharing(db: Session, note_id: int, user_id: int) -> Optional[Note]:
    db_note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == user_id
    ).first()
    if db_note:
        db_note.share_type = "private"
        db_note.share_token = None
        db_note.share_expires = None
        db_note.shared_with = []
        db_note.can_edit = False
        db.commit()
        db.refresh(db_note)
        return db_note
    return None