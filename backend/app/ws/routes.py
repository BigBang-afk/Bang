from __future__ import annotations

import asyncio
import contextlib

import orjson
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.logging import get_logger
from app.core.redis import cache_get_json, get_redis
from app.scanner.service import OPPORTUNITIES_CACHE_KEY, SCANNER_CACHE_KEY, SIGNALS_CACHE_KEY
from app.ws.manager import manager

router = APIRouter()
logger = get_logger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await manager.connect(ws)
    redis = get_redis()
    pubsub = redis.pubsub()
    subscribed_channels: set[str] = {"scanner:update"}
    await pubsub.psubscribe("scanner:*", "md:*")

    # Send an initial snapshot so the client has data immediately.
    for key, msg_type in (
        (SCANNER_CACHE_KEY, "tickers_snapshot"),
        (OPPORTUNITIES_CACHE_KEY, "opportunities_snapshot"),
        (SIGNALS_CACHE_KEY, "signals_snapshot"),
    ):
        data = await cache_get_json(key)
        if data is not None:
            await ws.send_json({"type": msg_type, "data": data})

    async def reader() -> None:
        async for message in pubsub.listen():
            if message.get("type") not in ("pmessage", "message"):
                continue
            channel = message.get("channel", "")
            try:
                payload = orjson.loads(message["data"])
            except (ValueError, TypeError, KeyError):
                continue
            await ws.send_json({"type": "channel_update", "channel": channel, "data": payload})

    async def writer() -> None:
        while True:
            raw = await ws.receive_text()
            try:
                msg = orjson.loads(raw)
            except (ValueError, TypeError):
                continue
            if msg.get("action") == "subscribe":
                for ch in msg.get("channels", []):
                    if ch not in subscribed_channels:
                        subscribed_channels.add(ch)
                        await pubsub.subscribe(ch)

    reader_task = asyncio.create_task(reader())
    try:
        await writer()
    except WebSocketDisconnect:
        pass
    finally:
        reader_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await reader_task
        await pubsub.close()
        await manager.disconnect(ws)
