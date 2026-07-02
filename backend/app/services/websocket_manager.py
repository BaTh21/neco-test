from typing import Dict, Set, Optional
from fastapi import WebSocket
import time
import asyncio

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        self.ws_user_map: Dict[WebSocket, int] = {}
        self.active_ws: Set[WebSocket] = set()
        self.active_calls: Dict[str, dict] = {}
        self.user_active_call: Dict[int, str] = {}
        self.call_lock = asyncio.Lock()
        self.call_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, chat_id: str, websocket: WebSocket, user_id: int):
        self.active_connections.setdefault(chat_id, set()).add(websocket)
        self.user_connections.setdefault(user_id, set()).add(websocket)
        self.ws_user_map[websocket] = user_id
        self.active_ws.add(websocket)

    def disconnect(self, chat_id: Optional[str], websocket: WebSocket, user_id: Optional[int] = None):
        self.ws_user_map.pop(websocket, None)
        self.active_ws.discard(websocket)

        if chat_id:
            conns = self.active_connections.get(chat_id)
            if conns:
                conns.discard(websocket)
                if not conns:
                    self.active_connections.pop(chat_id, None)

        if user_id is not None:
            uconns = self.user_connections.get(user_id)
            if uconns:
                uconns.discard(websocket)
                if not uconns:
                    self.user_connections.pop(user_id, None)

    async def broadcast(self, chat_id: str, message: dict, exclude: Set[WebSocket] = None):
        if chat_id not in self.active_connections:
            print("No active connections for:", chat_id)
            return
        exclude = exclude or set()
        dead_connections = set()
        for ws in list(self.active_connections[chat_id]):
            if ws in exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception as e:
                print("WebSocket send error:", e)
                dead_connections.add(ws)
        for ws in dead_connections:
            user_id = self.ws_user_map.get(ws)
            self.disconnect(chat_id, ws, user_id)

    async def send_to_user(self, user_id: int, message: dict):
        if user_id not in self.user_connections:
            return False
        sent = False
        for ws in list(self.user_connections[user_id]):
            try:
                await ws.send_json(message)
                sent = True
            except Exception:
                try:
                    await ws.close()
                except:
                    pass

                self.disconnect(None, ws, user_id)
        return sent
    
    def get_online_users_in_chat(self, chat_id: str) -> Set[int]:
        if chat_id not in self.active_connections:
            return set()
        
        return {
            self.ws_user_map.get(ws)
            for ws in self.active_connections[chat_id]
            if ws in self.ws_user_map
        }
        
    def create_call(
        self,
        room: str,
        caller_id: int,
        participants: set[int],
        participant_info: dict[int, dict],
        call_type="voice"
    ):
        self.active_calls[room] = {
            "room": room,
            "caller_id": caller_id,
            "participants": participants,
            "participant_info": participant_info,
            "status": "ringing",
            "created_at": time.time(),
            "accepted_by": {caller_id},
            "call_type": call_type,
        }

        for uid in participants:
            self.user_active_call[uid] = room
            
    async def end_call(self, room: str):
        async with self.call_lock:
            call = self.active_calls.pop(room, None)

            if not call:
                return

            participants = call["participants"]

            for uid in participants:
                self.user_active_call.pop(uid, None)

        for uid in participants:
            await self.send_to_user(uid, {
                "type": "call_ended",
                "room": room
            })
            
        task = self.call_tasks.pop(room, None)
        if task:
            task.cancel()

    def is_user_online(self, user_id: int):
        return (
            user_id in self.user_connections
            and len(self.user_connections[user_id]) > 0
        )
    
    async def cleanup_user_disconnect(self, user_id: int):
        await asyncio.sleep(5)

        if self.is_user_online(user_id):
            return

        room = self.user_active_call.get(user_id)

        if not room:
            return

        call = self.active_calls.get(room)

        if not call:
            return

        await self.leave_call(room, user_id)
        
    async def leave_call(self, room: str, user_id: int):
        call = self.active_calls.get(room)
        if not call:
            return

        if user_id not in call["participants"]:
            return

        call["participants"].discard(user_id)
        call["accepted_by"].discard(user_id)

        self.user_active_call.pop(user_id, None)

        info = call["participant_info"].get(user_id, {})

        for uid in call["participants"]:
            await self.send_to_user(uid, {
                "type": "participant_left",
                "room": room,
                "user_id": user_id,
                "username": info.get("username"),
                "avatar_url": info.get("avatar_url")
            })

        if len(call["participants"]) == 0:
            await self.end_call(room)
    
    async def notify_disconnect(self, user_id: int):
        room = self.user_active_call.get(user_id)

        if not room:
            return

        call = self.active_calls.get(room)

        if not call:
            return

        info = call["participant_info"].get(user_id, {})

        for uid in call["participants"]:
            if uid != user_id:
                await self.send_to_user(uid, {
                    "type": "disconnected",
                    "room": room,
                    "user_id": user_id,
                    "username": info.get("username"),
                    "avatar_url": info.get("avatar_url")
                })
                
    async def force_disconnect_user(self, user_id: int):
        conns = self.user_connections.pop(user_id, set())

        for ws in list(conns):
            self.ws_user_map.pop(ws, None)
            self.active_ws.discard(ws)

            # remove from chat maps safely
            for chat_id, ws_set in list(self.active_connections.items()):
                ws_set.discard(ws)
                if not ws_set:
                    self.active_connections.pop(chat_id, None)

        # handle call cleanup immediately
        room = self.user_active_call.pop(user_id, None)
        if room:
            call = self.active_calls.get(room)
            if call:
                call["participants"].discard(user_id)
                call["accepted_by"].discard(user_id)

                await self.notify_disconnect(user_id)

                if len(call["participants"]) < 2:
                    await self.end_call(room)
        
manager = WebSocketManager()