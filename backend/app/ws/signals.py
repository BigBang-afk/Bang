from fastapi import APIRouter, WebSocket

from app.ws.manager import run_pubsub_socket

router = APIRouter()


@router.websocket("/ws/signals")
async def all_signals_socket(websocket: WebSocket) -> None:
    await run_pubsub_socket(websocket, ["signals:updates"])


@router.websocket("/ws/signals/{symbol}")
async def symbol_signals_socket(websocket: WebSocket, symbol: str) -> None:
    await run_pubsub_socket(websocket, [f"signals:asset:{symbol}"])
