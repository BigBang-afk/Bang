from fastapi import APIRouter, WebSocket

from app.ws.manager import run_pubsub_socket

router = APIRouter()


@router.websocket("/ws/market/{symbol}")
async def market_socket(websocket: WebSocket, symbol: str) -> None:
    timeframe = websocket.query_params.get("timeframe", "1m")
    channel = f"candles:{symbol}:{timeframe}"
    await run_pubsub_socket(websocket, [channel])
