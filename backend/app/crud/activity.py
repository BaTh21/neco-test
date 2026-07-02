from app.models.activity import Activity, ActivityType
from sqlalchemy.orm import Session

from app.models.activity import Activity, ActivityType
from sqlalchemy.orm import Session
from app.services.notification import send_notification

def create_activity(
    db: Session,
    *,
    actor_id: int,
    recipient_id: int,
    activity_type: ActivityType,
    post_id: int | None = None,
    comment_id: int | None = None,
    friend_request_id: int | None = None,
    group_id: int | None = None,
    extra_data: dict | None = None,
    player_ids: list[str] | None = None
):
    # Don't create activity if actor and recipient are the same
    if actor_id == recipient_id:
        return None

    # Prevent duplicates for friend requests and group invites
    if activity_type in [ActivityType.friend_request, ActivityType.group_invite]:
        query = db.query(Activity).filter(
            Activity.actor_id == actor_id,
            Activity.recipient_id == recipient_id,
            Activity.type == activity_type,
        )
        if friend_request_id is not None:
            query = query.filter(Activity.friend_request_id == friend_request_id)
        if group_id is not None:
            query = query.filter(Activity.group_id == group_id)

        existing_activity = query.first()
        if existing_activity:
            return existing_activity

    # Create new activity
    activity = Activity(
        actor_id=actor_id,
        recipient_id=recipient_id,
        type=activity_type,
        post_id=post_id,
        comment_id=comment_id,
        friend_request_id=friend_request_id,
        group_id=group_id,
        extra_data=extra_data or {},
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    if player_ids:
        # Build a message based on activity type
        activity_messages = {
            ActivityType.post_like: f"User {actor_id} liked your post.",
            ActivityType.post_comment: f"User {actor_id} commented on your post.",
            ActivityType.friend_request: f"User {actor_id} sent you a friend request.",
            ActivityType.group_invite: f"User {actor_id} invited you to a group.",
        }
        message = activity_messages.get(activity_type, "You have a new activity.")

        # Send notification (ignore errors)
        try:
            send_notification(message, player_ids)
        except Exception as e:
            # Log error but don’t break the flow
            print(f"Failed to send notification: {e}")

    return activity


