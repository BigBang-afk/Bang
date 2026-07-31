"""Server-time broadcast used by the frontend to compute (and periodically
re-sync) the offset between server time and the local browser clock."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.signal_engine.server_time import now_utc

router = APIRouter()


@router.websocket("/ws/system-time")
async def system_time_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            await websocket.send_json({"type": "server_time", "server_time": now_utc().isoformat()})
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        pass
