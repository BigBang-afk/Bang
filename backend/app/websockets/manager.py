import json
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks connected clients per channel (e.g. "prices", "signals") and broadcasts JSON payloads."""

    def __init__(self):
        self._connections: dict[str, set[WebSocket]] = {}

    async def connect(self, channel: str, websocket: WebSocket):
        await websocket.accept()
        self._connections.setdefault(channel, set()).add(websocket)

    def disconnect(self, channel: str, websocket: WebSocket):
        self._connections.get(channel, set()).discard(websocket)

    async def broadcast(self, channel: str, payload: dict):
        dead: list[WebSocket] = []
        for ws in self._connections.get(channel, set()):
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(channel, ws)


manager = ConnectionManager()
