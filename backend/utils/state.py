from fastapi import WebSocket
from typing import List, Dict, Any

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.active_connections.remove(connection)

manager = ConnectionManager()
async_loop = None

# Simple in-memory event log to support dynamic health metrics
event_log: List[Dict[str, Any]] = []

# health score history for trend chart
health_history: List[Dict[str, Any]] = []
