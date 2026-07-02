from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class NotificationRequest(BaseModel):
    message: str
    player_ids: List[str]