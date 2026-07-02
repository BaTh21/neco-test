from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from app.models.base import Base
from datetime import datetime  
import enum
from sqlalchemy.orm import relationship

class DiaryCommentLike(Base):
    __tablename__ = "diary_comment_likes"

    id = Column(Integer, primary_key=True)
    comment_id = Column(
        Integer,
        ForeignKey("diary_comments.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("comment_id", "user_id", name="uq_comment_user_like"),
    )

    comment = relationship("DiaryComment", back_populates="likes")
    user = relationship("User", backref="diary_comment_likes")

