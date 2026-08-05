import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.trade import JournalEntry, TradeSide

router = APIRouter(prefix="/journal", tags=["journal"])


class JournalEntryCreate(BaseModel):
    symbol: str
    side: TradeSide
    entry_price: float
    quantity: float
    leverage: float = 1.0
    stop_loss: float | None = None
    take_profit: float | None = None
    opened_at: datetime
    confidence_at_entry: float | None = None
    reason: str | None = None
    signal_id: uuid.UUID | None = None
    tags: list[str] = []


class JournalEntryUpdate(BaseModel):
    exit_price: float | None = None
    closed_at: datetime | None = None
    mistakes: str | None = None
    lessons: str | None = None
    screenshots: list[str] | None = None
    tags: list[str] | None = None


class JournalEntryOut(BaseModel):
    id: uuid.UUID
    symbol: str
    side: TradeSide
    entry_price: float
    exit_price: float | None
    quantity: float
    leverage: float
    stop_loss: float | None
    take_profit: float | None
    opened_at: datetime
    closed_at: datetime | None
    pnl: float | None
    pnl_percent: float | None
    confidence_at_entry: float | None
    reason: str | None
    mistakes: str | None
    lessons: str | None
    screenshots: list
    tags: list

    class Config:
        from_attributes = True


@router.get("", response_model=list[JournalEntryOut])
async def list_entries(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(JournalEntry).where(JournalEntry.user_id == user.id).order_by(JournalEntry.opened_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=JournalEntryOut, status_code=201)
async def create_entry(payload: JournalEntryCreate, user: CurrentUser, db: DbSession):
    entry = JournalEntry(user_id=user.id, **payload.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=JournalEntryOut)
async def update_entry(entry_id: uuid.UUID, payload: JournalEntryUpdate, user: CurrentUser, db: DbSession):
    result = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id, JournalEntry.user_id == user.id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(entry, key, value)

    if entry.exit_price is not None:
        direction = 1 if entry.side == TradeSide.LONG else -1
        entry.pnl = round((entry.exit_price - entry.entry_price) * direction * entry.quantity * entry.leverage, 4)
        entry.pnl_percent = round((entry.exit_price - entry.entry_price) / entry.entry_price * direction * 100 * entry.leverage, 4)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(entry_id: uuid.UUID, user: CurrentUser, db: DbSession):
    result = await db.execute(select(JournalEntry).where(JournalEntry.id == entry_id, JournalEntry.user_id == user.id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    await db.delete(entry)
    await db.commit()
