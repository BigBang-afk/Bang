import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.trade import Trade
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.trade import TradeCreate, TradeOut, TradeUpdate

router = APIRouter(prefix="/journal", tags=["journal"])


@router.get("", response_model=list[TradeOut])
async def list_trades(limit: int = 100, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Trade).where(Trade.user_id == user.id).order_by(Trade.opened_at.desc()).limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=TradeOut, status_code=201)
async def create_trade(payload: TradeCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    trade = Trade(user_id=user.id, **payload.model_dump())
    db.add(trade)
    await db.commit()
    await db.refresh(trade)
    return trade


@router.patch("/{trade_id}", response_model=TradeOut)
async def update_trade(
    trade_id: uuid.UUID,
    payload: TradeUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trade).where(Trade.id == trade_id, Trade.user_id == user.id))
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(trade, field, value)

    await db.commit()
    await db.refresh(trade)
    return trade
