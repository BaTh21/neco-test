from pydantic import BaseModel

class TokenRequest(BaseModel):
    room: str