from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.asset import Asset
from app.schemas.asset import AssetResponse, CandleResponse, ExpiryAvailabilityResponse
from app.services.candles.aggregator import get_recent_candles
from app.services.market_data.capabilities import available_expiries
from app.services.market_data.manager import market_data_manager

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=list[AssetResponse])
async def list_assets(session: AsyncSession = Depends(get_db)) -> list[Asset]:
    result = await session.execute(select(Asset).where(Asset.is_enabled.is_(True)).order_by(Asset.symbol))
    return list(result.scalars().all())


async def _get_asset_or_404(symbol: str, session: AsyncSession) -> Asset:
    normalized = symbol.replace("-", "/").upper()
    result = await session.execute(select(Asset).where(Asset.symbol == normalized))
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown asset symbol: {symbol}")
    return asset


@router.get("/{symbol}", response_model=AssetResponse)
async def get_asset(symbol: str, session: AsyncSession = Depends(get_db)) -> Asset:
    return await _get_asset_or_404(symbol, session)


@router.get("/{symbol}/candles", response_model=list[CandleResponse])
async def get_candles(
    symbol: str,
    timeframe: str = Query(default="1m", pattern="^(1m|5m|15m)$"),
    limit: int = Query(default=300, ge=1, le=1000),
    session: AsyncSession = Depends(get_db),
) -> list[CandleResponse]:
    asset = await _get_asset_or_404(symbol, session)
    candles = await get_recent_candles(session, asset.id, timeframe, limit)
    return [
        CandleResponse(
            timestamp=c.timestamp,
            open=float(c.open),
            high=float(c.high),
            low=float(c.low),
            close=float(c.close),
            volume=float(c.volume),
            is_complete=c.is_complete,
        )
        for c in candles
    ]


@router.get("/{symbol}/expiries", response_model=list[ExpiryAvailabilityResponse])
async def get_expiries(symbol: str, session: AsyncSession = Depends(get_db)) -> list[ExpiryAvailabilityResponse]:
    await _get_asset_or_404(symbol, session)
    provider = market_data_manager.active
    return [
        ExpiryAvailabilityResponse(seconds=a.seconds, enabled=a.enabled, reason=a.reason)
        for a in available_expiries(provider)
    ]
