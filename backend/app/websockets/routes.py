from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websockets.manager import manager

router = APIRouter()


@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    if channel not in ("prices", "signals"):
        await websocket.close(code=4004)
        return

    await manager.connect(channel, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive / ignore inbound
    except WebSocketDisconnect:
        manager.disconnect(channel, websocket)
