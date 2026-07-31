"""Admin-only system health socket. Requires a valid admin JWT."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.market_data.manager import market_data_manager
from app.ws.auth import authenticate_ws

router = APIRouter()


@router.websocket("/ws/admin/system-health")
async def admin_system_health_socket(websocket: WebSocket) -> None:
    payload = await authenticate_ws(websocket)
    if not payload or payload.get("role") != "admin":
        await websocket.close(code=4401)
        return

    await websocket.accept()
    try:
        while True:
            provider = market_data_manager.active
            await websocket.send_json(
                {
                    "type": "system_health",
                    "active_provider": provider.name,
                    "using_fallback": market_data_manager.using_fallback,
                    "connected": provider.health.connected,
                    "latency_ms": provider.health.latency_ms,
                    "last_tick_at": provider.health.last_tick_at.isoformat() if provider.health.last_tick_at else None,
                    "reconnect_count": provider.health.reconnect_count,
                    "is_delayed": provider.health.is_delayed,
                    "last_error": provider.health.last_error,
                }
            )
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        pass
