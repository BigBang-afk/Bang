"""Synchronized countdown/timer-state computation.

All timer math is done from server-generated timestamps (generated_at,
entry_time, entry_window_end, expiry_time) compared against the current
server time - never the client clock - so the frontend only needs the
offset between server_time and its own Date.now() to stay accurate across
refreshes and reconnections.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum

from app.models.enums import SignalResult, SignalStatus


class TimerState(str, Enum):
    WAITING_FOR_ENTRY = "WAITING_FOR_ENTRY"
    ENTER_NOW = "ENTER_NOW"
    ENTRY_WINDOW_CLOSED = "ENTRY_WINDOW_CLOSED"
    TRADE_ACTIVE = "TRADE_ACTIVE"
    EXPIRING = "EXPIRING"
    CHECKING_RESULT = "CHECKING_RESULT"
    WIN = "WIN"
    LOSS = "LOSS"
    DRAW = "DRAW"
    DATA_ERROR = "DATA_ERROR"


EXPIRING_THRESHOLD_SECONDS = 10


@dataclass
class TimerSnapshot:
    state: TimerState
    server_time: datetime
    generated_at: datetime
    entry_time: datetime
    entry_window_end: datetime
    expiry_time: datetime
    remaining_ms: int
    total_window_ms: int
    progress_pct: float


def compute_timer_state(
    *,
    status: SignalStatus,
    result: SignalResult,
    generated_at: datetime,
    entry_time: datetime,
    entry_window_end: datetime,
    expiry_time: datetime,
    server_time: datetime | None = None,
) -> TimerSnapshot:
    now = server_time or datetime.now(timezone.utc)

    if status == SignalStatus.COMPLETED:
        state = {
            SignalResult.WIN: TimerState.WIN,
            SignalResult.LOSS: TimerState.LOSS,
            SignalResult.DRAW: TimerState.DRAW,
            SignalResult.DATA_ERROR: TimerState.DATA_ERROR,
        }.get(result, TimerState.DATA_ERROR)
        return TimerSnapshot(
            state=state,
            server_time=now,
            generated_at=generated_at,
            entry_time=entry_time,
            entry_window_end=entry_window_end,
            expiry_time=expiry_time,
            remaining_ms=0,
            total_window_ms=int((expiry_time - entry_time).total_seconds() * 1000),
            progress_pct=100.0,
        )

    if status == SignalStatus.DATA_ERROR:
        return TimerSnapshot(
            state=TimerState.DATA_ERROR,
            server_time=now,
            generated_at=generated_at,
            entry_time=entry_time,
            entry_window_end=entry_window_end,
            expiry_time=expiry_time,
            remaining_ms=0,
            total_window_ms=0,
            progress_pct=0.0,
        )

    if now < entry_time:
        remaining = int((entry_time - now).total_seconds() * 1000)
        total = int((entry_time - generated_at).total_seconds() * 1000) or 1
        elapsed = total - remaining
        state = TimerState.ENTER_NOW if remaining <= 1000 else TimerState.WAITING_FOR_ENTRY
        return TimerSnapshot(
            state=state,
            server_time=now,
            generated_at=generated_at,
            entry_time=entry_time,
            entry_window_end=entry_window_end,
            expiry_time=expiry_time,
            remaining_ms=max(0, remaining),
            total_window_ms=total,
            progress_pct=round(max(0.0, elapsed / total * 100), 2),
        )

    if entry_time <= now < entry_window_end:
        remaining = int((entry_window_end - now).total_seconds() * 1000)
        total = int((entry_window_end - entry_time).total_seconds() * 1000) or 1
        return TimerSnapshot(
            state=TimerState.ENTER_NOW,
            server_time=now,
            generated_at=generated_at,
            entry_time=entry_time,
            entry_window_end=entry_window_end,
            expiry_time=expiry_time,
            remaining_ms=max(0, remaining),
            total_window_ms=total,
            progress_pct=round((total - remaining) / total * 100, 2),
        )

    if status == SignalStatus.ENTRY_WINDOW_CLOSED:
        return TimerSnapshot(
            state=TimerState.ENTRY_WINDOW_CLOSED,
            server_time=now,
            generated_at=generated_at,
            entry_time=entry_time,
            entry_window_end=entry_window_end,
            expiry_time=expiry_time,
            remaining_ms=0,
            total_window_ms=0,
            progress_pct=0.0,
        )

    if now < expiry_time:
        remaining = int((expiry_time - now).total_seconds() * 1000)
        total = int((expiry_time - entry_time).total_seconds() * 1000) or 1
        elapsed = total - remaining
        state = TimerState.EXPIRING if remaining <= EXPIRING_THRESHOLD_SECONDS * 1000 else TimerState.TRADE_ACTIVE
        return TimerSnapshot(
            state=state,
            server_time=now,
            generated_at=generated_at,
            entry_time=entry_time,
            entry_window_end=entry_window_end,
            expiry_time=expiry_time,
            remaining_ms=max(0, remaining),
            total_window_ms=total,
            progress_pct=round(max(0.0, elapsed / total * 100), 2),
        )

    total = int((expiry_time - entry_time).total_seconds() * 1000) or 1
    return TimerSnapshot(
        state=TimerState.CHECKING_RESULT,
        server_time=now,
        generated_at=generated_at,
        entry_time=entry_time,
        entry_window_end=entry_window_end,
        expiry_time=expiry_time,
        remaining_ms=0,
        total_window_ms=total,
        progress_pct=100.0,
    )
