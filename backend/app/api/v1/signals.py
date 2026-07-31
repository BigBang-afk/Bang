from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.asset import Asset
from app.models.enums import SignalResult, SignalStatus
from app.models.signal import Signal
from app.models.strategy import Strategy
from app.schemas.signal import SignalReasonResponse, SignalResponse, SignalStatisticsResponse

router = APIRouter(prefix="/signals", tags=["signals"])

_ACTIVE_STATUSES = [
    SignalStatus.PENDING_ENTRY,
    SignalStatus.ENTRY_WINDOW_CLOSED,
    SignalStatus.ACTIVE,
    SignalStatus.EXPIRING,
    SignalStatus.CHECKING_RESULT,
]


def _to_response(signal: Signal, asset: Asset, strategy: Strategy) -> SignalResponse:
    return SignalResponse(
        public_signal_id=signal.public_signal_id,
        asset_symbol=asset.symbol,
        strategy_code=strategy.strategy_code,
        strategy_name=strategy.name,
        direction=signal.direction,
        timeframe=signal.timeframe,
        expiry_seconds=signal.expiry_seconds,
        generated_at=signal.generated_at,
        entry_time=signal.entry_time,
        entry_window_end=signal.entry_window_end,
        entry_price=float(signal.entry_price) if signal.entry_price is not None else None,
        expiry_time=signal.expiry_time,
        expiry_price=float(signal.expiry_price) if signal.expiry_price is not None else None,
        confidence=signal.confidence,
        confidence_type=signal.confidence_type,
        market_condition=signal.market_condition,
        status=signal.status,
        result=signal.result,
        strategy_version=signal.strategy_version,
        model_version=signal.model_version,
        provider=signal.provider,
        data_latency_ms=signal.data_latency_ms,
        ai_auto_mode=signal.ai_auto_mode,
        supporting_strategies=signal.supporting_strategies_json or [],
        reasons=[
            SignalReasonResponse(reason_code=r.reason_code, reason_text=r.reason_text, score=r.score)
            for r in signal.reasons
        ],
    )


@router.get("/live", response_model=list[SignalResponse])
async def live_signals(
    symbol: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> list[SignalResponse]:
    stmt = (
        select(Signal)
        .options(selectinload(Signal.reasons))
        .where(Signal.status.in_(_ACTIVE_STATUSES))
        .order_by(Signal.generated_at.desc())
        .limit(100)
    )
    signals = (await session.execute(stmt)).scalars().all()

    responses: list[SignalResponse] = []
    for signal in signals:
        asset = await session.get(Asset, signal.asset_id)
        strategy = await session.get(Strategy, signal.strategy_id)
        if symbol and asset.symbol != symbol:
            continue
        responses.append(_to_response(signal, asset, strategy))
    return responses


@router.get("/history", response_model=list[SignalResponse])
async def signal_history(
    symbol: str | None = Query(default=None),
    strategy_code: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
) -> list[SignalResponse]:
    stmt = (
        select(Signal)
        .options(selectinload(Signal.reasons))
        .where(Signal.status == SignalStatus.COMPLETED)
        .order_by(Signal.generated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    signals = (await session.execute(stmt)).scalars().all()

    responses: list[SignalResponse] = []
    for signal in signals:
        asset = await session.get(Asset, signal.asset_id)
        strategy = await session.get(Strategy, signal.strategy_id)
        if symbol and asset.symbol != symbol:
            continue
        if strategy_code and strategy.strategy_code != strategy_code:
            continue
        responses.append(_to_response(signal, asset, strategy))
    return responses


@router.get("/statistics", response_model=SignalStatisticsResponse)
async def signal_statistics(session: AsyncSession = Depends(get_db)) -> SignalStatisticsResponse:
    completed_stmt = select(Signal).where(Signal.status == SignalStatus.COMPLETED).order_by(Signal.generated_at)
    completed = (await session.execute(completed_stmt)).scalars().all()

    wins = sum(1 for s in completed if s.result == SignalResult.WIN)
    losses = sum(1 for s in completed if s.result == SignalResult.LOSS)
    draws = sum(1 for s in completed if s.result == SignalResult.DRAW)
    errors = sum(1 for s in completed if s.result == SignalResult.DATA_ERROR)
    total = len(completed)
    decisive = wins + losses

    max_win_streak = max_lose_streak = cur_win = cur_lose = 0
    by_strategy: dict[str, dict] = {}
    by_asset: dict[str, dict] = {}
    by_expiry: dict[str, dict] = {}

    for s in completed:
        if s.result == SignalResult.WIN:
            cur_win += 1
            cur_lose = 0
        elif s.result == SignalResult.LOSS:
            cur_lose += 1
            cur_win = 0
        else:
            cur_win = cur_lose = 0
        max_win_streak = max(max_win_streak, cur_win)
        max_lose_streak = max(max_lose_streak, cur_lose)

        strategy = await session.get(Strategy, s.strategy_id)
        asset = await session.get(Asset, s.asset_id)
        for bucket, key in (
            (by_strategy, strategy.strategy_code),
            (by_asset, asset.symbol),
            (by_expiry, str(s.expiry_seconds)),
        ):
            entry = bucket.setdefault(key, {"total": 0, "wins": 0, "losses": 0, "draws": 0})
            entry["total"] += 1
            if s.result == SignalResult.WIN:
                entry["wins"] += 1
            elif s.result == SignalResult.LOSS:
                entry["losses"] += 1
            elif s.result == SignalResult.DRAW:
                entry["draws"] += 1

    for bucket in (by_strategy, by_asset, by_expiry):
        for entry in bucket.values():
            decisive_bucket = entry["wins"] + entry["losses"]
            entry["win_rate"] = round(entry["wins"] / decisive_bucket * 100, 2) if decisive_bucket else 0.0

    return SignalStatisticsResponse(
        total_completed=total,
        wins=wins,
        losses=losses,
        draws=draws,
        data_errors=errors,
        win_rate=round(wins / total * 100, 2) if total else 0.0,
        win_rate_excluding_draws=round(wins / decisive * 100, 2) if decisive else 0.0,
        max_losing_streak=max_lose_streak,
        max_winning_streak=max_win_streak,
        by_strategy=by_strategy,
        by_asset=by_asset,
        by_expiry=by_expiry,
    )


@router.get("/{signal_id}", response_model=SignalResponse)
async def get_signal(signal_id: str, session: AsyncSession = Depends(get_db)) -> SignalResponse:
    stmt = select(Signal).options(selectinload(Signal.reasons)).where(Signal.public_signal_id == signal_id)
    signal = (await session.execute(stmt)).scalar_one_or_none()
    if signal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Signal not found")
    asset = await session.get(Asset, signal.asset_id)
    strategy = await session.get(Strategy, signal.strategy_id)
    return _to_response(signal, asset, strategy)
