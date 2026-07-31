"""Countdown/timer-state math: server-time-anchored, refresh/reconnect safe."""

from datetime import datetime, timedelta, timezone

from app.models.enums import SignalResult, SignalStatus
from app.services.signal_engine.countdown import TimerState, compute_timer_state


def _base_times():
    generated_at = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    entry_time = generated_at + timedelta(seconds=1)
    entry_window_end = entry_time + timedelta(seconds=5)
    expiry_time = entry_time + timedelta(seconds=60)
    return generated_at, entry_time, entry_window_end, expiry_time


def test_waiting_for_entry_before_entry_time():
    # A signal generated well before its entry window opens (e.g. a longer
    # entry delay) should read WAITING_FOR_ENTRY until inside the final
    # second, where it switches to ENTER_NOW.
    generated_at = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    entry_time = generated_at + timedelta(seconds=10)
    entry_window_end = entry_time + timedelta(seconds=5)
    expiry_time = entry_time + timedelta(seconds=60)

    snapshot = compute_timer_state(
        status=SignalStatus.PENDING_ENTRY,
        result=SignalResult.PENDING,
        generated_at=generated_at,
        entry_time=entry_time,
        entry_window_end=entry_window_end,
        expiry_time=expiry_time,
        server_time=generated_at + timedelta(seconds=2),
    )
    assert snapshot.state == TimerState.WAITING_FOR_ENTRY


def test_enter_now_within_entry_window():
    generated_at, entry_time, entry_window_end, expiry_time = _base_times()
    snapshot = compute_timer_state(
        status=SignalStatus.PENDING_ENTRY,
        result=SignalResult.PENDING,
        generated_at=generated_at,
        entry_time=entry_time,
        entry_window_end=entry_window_end,
        expiry_time=expiry_time,
        server_time=entry_time + timedelta(seconds=2),
    )
    assert snapshot.state == TimerState.ENTER_NOW


def test_trade_active_then_expiring_in_final_ten_seconds():
    generated_at, entry_time, entry_window_end, expiry_time = _base_times()
    mid_trade = compute_timer_state(
        status=SignalStatus.ACTIVE,
        result=SignalResult.PENDING,
        generated_at=generated_at,
        entry_time=entry_time,
        entry_window_end=entry_window_end,
        expiry_time=expiry_time,
        server_time=expiry_time - timedelta(seconds=30),
    )
    assert mid_trade.state == TimerState.TRADE_ACTIVE

    near_expiry = compute_timer_state(
        status=SignalStatus.ACTIVE,
        result=SignalResult.PENDING,
        generated_at=generated_at,
        entry_time=entry_time,
        entry_window_end=entry_window_end,
        expiry_time=expiry_time,
        server_time=expiry_time - timedelta(seconds=5),
    )
    assert near_expiry.state == TimerState.EXPIRING


def test_checking_result_after_expiry_before_completion():
    generated_at, entry_time, entry_window_end, expiry_time = _base_times()
    snapshot = compute_timer_state(
        status=SignalStatus.ACTIVE,
        result=SignalResult.PENDING,
        generated_at=generated_at,
        entry_time=entry_time,
        entry_window_end=entry_window_end,
        expiry_time=expiry_time,
        server_time=expiry_time + timedelta(seconds=1),
    )
    assert snapshot.state == TimerState.CHECKING_RESULT


def test_completed_states_map_to_win_loss_draw_error():
    generated_at, entry_time, entry_window_end, expiry_time = _base_times()
    for result, expected in (
        (SignalResult.WIN, TimerState.WIN),
        (SignalResult.LOSS, TimerState.LOSS),
        (SignalResult.DRAW, TimerState.DRAW),
        (SignalResult.DATA_ERROR, TimerState.DATA_ERROR),
    ):
        snapshot = compute_timer_state(
            status=SignalStatus.COMPLETED,
            result=result,
            generated_at=generated_at,
            entry_time=entry_time,
            entry_window_end=entry_window_end,
            expiry_time=expiry_time,
            server_time=expiry_time + timedelta(seconds=5),
        )
        assert snapshot.state == expected
        assert snapshot.remaining_ms == 0


def test_countdown_uses_explicit_server_time_not_wall_clock():
    """The whole point of server-time anchoring: passing a server_time far
    in the future must move the timer forward even though real wall-clock
    time has not actually advanced - proving the timer trusts server_time,
    not datetime.now()."""
    generated_at, entry_time, entry_window_end, expiry_time = _base_times()
    far_future = expiry_time + timedelta(days=1)
    snapshot = compute_timer_state(
        status=SignalStatus.ACTIVE,
        result=SignalResult.PENDING,
        generated_at=generated_at,
        entry_time=entry_time,
        entry_window_end=entry_window_end,
        expiry_time=expiry_time,
        server_time=far_future,
    )
    assert snapshot.state == TimerState.CHECKING_RESULT


def test_countdown_does_not_restart_after_refresh():
    """Calling compute_timer_state twice with the same signal timestamps and
    the same server_time (simulating a page refresh) must return an
    identical snapshot - proving the timer is a pure function of stored
    timestamps, not of any client-side mutable state."""
    generated_at, entry_time, entry_window_end, expiry_time = _base_times()
    server_time = entry_time + timedelta(seconds=20)

    first_load = compute_timer_state(
        status=SignalStatus.ACTIVE,
        result=SignalResult.PENDING,
        generated_at=generated_at,
        entry_time=entry_time,
        entry_window_end=entry_window_end,
        expiry_time=expiry_time,
        server_time=server_time,
    )
    simulated_refresh = compute_timer_state(
        status=SignalStatus.ACTIVE,
        result=SignalResult.PENDING,
        generated_at=generated_at,
        entry_time=entry_time,
        entry_window_end=entry_window_end,
        expiry_time=expiry_time,
        server_time=server_time,
    )
    assert first_load.remaining_ms == simulated_refresh.remaining_ms
    assert first_load.state == simulated_refresh.state
    assert first_load.progress_pct == simulated_refresh.progress_pct
