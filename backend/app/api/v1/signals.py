import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.signal import Signal, SignalDirection, SignalStatus
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.signal import ScanRequest, SignalOut
from app.services.mexc_client import MexcClient
from app.services.scanner import scan_market

router = APIRouter(prefix="/signals", tags=["signals"])

# Curated list of liquid USDT pairs scanned by default; a full exchangeInfo pull can replace this.
DEFAULT_SCAN_UNIVERSE = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
    "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "TRXUSDT",
]


@router.get("", response_model=list[SignalOut])
async def list_signals(
    status: SignalStatus | None = None,
    limit: int = 50,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Signal).order_by(Signal.created_at.desc()).limit(limit)
    if status:
        query = query.where(Signal.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{signal_id}", response_model=SignalOut)
async def get_signal(signal_id: uuid.UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Signal).where(Signal.id == signal_id))
    return result.scalar_one()


@router.post("/scan", response_model=list[SignalOut])
async def scan_now(
    payload: ScanRequest,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Runs an on-demand scan across the target symbol universe and persists any
    high-confidence signals. The continuous background scanner (see app.main lifespan)
    does this automatically; this endpoint is for an immediate manual refresh."""
    client = MexcClient()
    try:
        symbols = payload.symbols or DEFAULT_SCAN_UNIVERSE
        results = await scan_market(client, symbols, payload.trading_mode)
    finally:
        await client.aclose()

    saved: list[Signal] = []
    for r in results:
        signal = Signal(
            symbol=r.symbol,
            direction=SignalDirection(r.direction),
            trading_mode=r.trading_mode,
            timeframe=r.timeframe,
            entry_price=r.entry_price,
            stop_loss=r.stop_loss,
            take_profit_1=r.take_profit_1,
            take_profit_2=r.take_profit_2,
            take_profit_3=r.take_profit_3,
            invalidation_level=r.invalidation_level,
            risk_reward_ratio=r.risk_reward_ratio,
            confidence_score=r.confidence_score,
            score_breakdown=r.score_breakdown,
            reasons=r.reasons,
            market_structure_summary=r.market_structure_summary,
            expected_scenario=r.expected_scenario,
            estimated_holding_time=r.estimated_holding_time,
            higher_timeframe_confirmed=r.higher_timeframe_confirmed,
        )
        db.add(signal)
        saved.append(signal)

    await db.commit()
    for s in saved:
        await db.refresh(s)
    return saved
