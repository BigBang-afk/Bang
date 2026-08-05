from sqlalchemy import select

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.db.models.trade import JournalEntry

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/positions")
async def open_positions(user: CurrentUser, db: DbSession):
    """Open positions are journal entries the user has logged but not yet closed.
    (Live sync against a connected MEXC account is a Phase 2 extension once
    users attach real API keys via /settings.)"""
    result = await db.execute(
        select(JournalEntry).where(JournalEntry.user_id == user.id, JournalEntry.closed_at.is_(None))
    )
    entries = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "symbol": e.symbol,
            "side": e.side,
            "entry_price": e.entry_price,
            "quantity": e.quantity,
            "leverage": e.leverage,
            "stop_loss": e.stop_loss,
            "take_profit": e.take_profit,
            "opened_at": e.opened_at,
        }
        for e in entries
    ]
