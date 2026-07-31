"""Per-signal countdown socket.

Pushes a server-time-anchored timer snapshot roughly once per second. The
frontend interpolates smoothly between ticks using the server_time offset,
so animation smoothness never affects timing accuracy, and a page refresh
or reconnect simply re-derives state from the same server timestamps.
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.signal import Signal
from app.services.signal_engine.countdown import TimerState, compute_timer_state
from app.services.signal_engine.server_time import now_utc

router = APIRouter()

TICK_SECONDS = 1.0
_TERMINAL_STATES = {TimerState.WIN, TimerState.LOSS, TimerState.DRAW, TimerState.DATA_ERROR}


@router.websocket("/ws/countdown/{signal_id}")
async def countdown_socket(websocket: WebSocket, signal_id: str) -> None:
    await websocket.accept()
    try:
        while True:
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(Signal).where(Signal.public_signal_id == signal_id))
                signal = result.scalar_one_or_none()

            if signal is None:
                await websocket.send_json({"type": "error", "message": "Signal not found"})
                break

            snapshot = compute_timer_state(
                status=signal.status,
                result=signal.result,
                generated_at=signal.generated_at,
                entry_time=signal.entry_time,
                entry_window_end=signal.entry_window_end,
                expiry_time=signal.expiry_time,
                server_time=now_utc(),
            )
            await websocket.send_json(
                {
                    "type": "countdown",
                    "public_signal_id": signal.public_signal_id,
                    "state": snapshot.state.value,
                    "server_time": snapshot.server_time.isoformat(),
                    "generated_at": snapshot.generated_at.isoformat(),
                    "entry_time": snapshot.entry_time.isoformat(),
                    "entry_window_end": snapshot.entry_window_end.isoformat(),
                    "expiry_time": snapshot.expiry_time.isoformat(),
                    "remaining_ms": snapshot.remaining_ms,
                    "total_window_ms": snapshot.total_window_ms,
                    "progress_pct": snapshot.progress_pct,
                }
            )

            if snapshot.state in _TERMINAL_STATES:
                break
            await asyncio.sleep(TICK_SECONDS)
    except WebSocketDisconnect:
        pass
