"""Shared WebSocket connection management: heartbeats, per-connection rate
limiting and Redis pub/sub bridging so multiple backend workers can fan out
the same event to all subscribed clients.
"""

from __future__ import annotations

import asyncio
import time

from fastapi import WebSocket, WebSocketDisconnect

from app.core.logging import get_logger
from app.db.redis import get_redis

logger = get_logger(__name__)

HEARTBEAT_INTERVAL_SECONDS = 15
MAX_MESSAGES_PER_MINUTE = 120


class RateLimiter:
    def __init__(self, max_per_minute: int = MAX_MESSAGES_PER_MINUTE) -> None:
        self.max_per_minute = max_per_minute
        self._timestamps: list[float] = []

    def allow(self) -> bool:
        now = time.monotonic()
        cutoff = now - 60
        self._timestamps = [t for t in self._timestamps if t > cutoff]
        if len(self._timestamps) >= self.max_per_minute:
            return False
        self._timestamps.append(now)
        return True


async def redis_channel_bridge(websocket: WebSocket, channels: list[str], stop_event: asyncio.Event) -> None:
    """Subscribe to one or more Redis pub/sub channels and forward every
    message to the connected client as-is (already JSON-encoded by publishers)."""
    redis = get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(*channels)
    try:
        while not stop_event.is_set():
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message is not None:
                await websocket.send_text(message["data"])
    finally:
        await pubsub.unsubscribe(*channels)
        await pubsub.aclose()


async def heartbeat_loop(websocket: WebSocket, stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
        try:
            await websocket.send_json({"type": "heartbeat", "ts": time.time()})
        except (WebSocketDisconnect, RuntimeError, ConnectionError):
            # Any send failure means the socket is already gone; stop the loop.
            stop_event.set()
            break


async def run_pubsub_socket(websocket: WebSocket, channels: list[str]) -> None:
    """Standard lifecycle for a read-mostly broadcast socket: accept, bridge
    Redis pub/sub to the client, send heartbeats, and clean up on disconnect."""
    await websocket.accept()
    stop_event = asyncio.Event()
    bridge_task = asyncio.create_task(redis_channel_bridge(websocket, channels, stop_event))
    heartbeat_task = asyncio.create_task(heartbeat_loop(websocket, stop_event))
    try:
        while not stop_event.is_set():
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
    except WebSocketDisconnect:
        pass
    finally:
        stop_event.set()
        bridge_task.cancel()
        heartbeat_task.cancel()
        for task in (bridge_task, heartbeat_task):
            try:
                await task
            except asyncio.CancelledError:
                pass
            except Exception:
                # Best-effort cleanup during shutdown - a stray exception
                # from an already-cancelled task must not block teardown.
                logger.debug("ws_task_cleanup_error", exc_info=True)
