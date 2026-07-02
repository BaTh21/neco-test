from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends, APIRouter
from app.models.activity import Activity, ActivityType
from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.activity import ActivityBase, ActivityDeleteRequest
from app.schemas.notification import NotificationRequest
from app.services.notification import send_notification
import os
import requests
from sqlalchemy import func

router = APIRouter()

@router.get("/", response_model=list[ActivityBase])
def get_my_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0
):
    activities = (
        db.query(Activity)
        .filter(Activity.recipient_id == current_user.id)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return activities

@router.get("/unread/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(func.count(Activity.id))
        .filter(
            Activity.recipient_id == current_user.id,
            Activity.is_read == False
        )
        .scalar()
    )

    return {"unread_count": count}

@router.patch("/{activity_id}/read")
def mark_activity_read(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    activity = db.query(Activity).filter(
        Activity.id == activity_id,
        Activity.recipient_id == current_user.id
    ).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Not found")

    activity.is_read = True
    db.commit()

    return {"message": "Marked as read"}

@router.delete("/{activity_id}")
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a single activity"""
    activity = db.query(Activity).filter(
        Activity.id == activity_id,
        Activity.recipient_id == current_user.id
    ).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    db.delete(activity)
    db.commit()
    return {"message": "Activity deleted successfully"}

@router.delete("/")
def delete_activities(
    request: ActivityDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete multiple activities"""
    activities = db.query(Activity).filter(
        Activity.id.in_(request.ids),
        Activity.recipient_id == current_user.id
    ).all()

    for activity in activities:
        db.delete(activity)
    db.commit()
    return {"message": f"Deleted {len(activities)} activities"}

@router.post("/notify/all/")
async def notify_all(message: str):
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Basic {os.getenv('ONESIGNAL_REST_API_KEY')}"
    }
    payload = {
        "app_id": os.getenv('ONESIGNAL_APP_ID'),
        "included_segments": ["Subscribed Users"],
        "contents": {"en": message}
    }
    response = requests.post(os.getenv('ONESIGNAL_API_URL'), headers=headers, json=payload)
    return {"result": response.json()}

