from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.db.models.trade import JournalEntry

router = APIRouter(prefix="/performance", tags=["performance"])

SESSIONS = [
    ("Asia", 0, 8),
    ("London", 8, 16),
    ("New York", 13, 21),
]


def _session_for_hour(hour: int) -> str:
    for name, start, end in SESSIONS:
        if start <= hour < end:
            return name
    return "Asia"


@router.get("")
async def performance(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(JournalEntry).where(JournalEntry.user_id == user.id, JournalEntry.closed_at.is_not(None))
    )
    trades = result.scalars().all()

    if not trades:
        return {
            "daily_pnl": 0,
            "weekly_pnl": 0,
            "monthly_pnl": 0,
            "overall_win_rate": None,
            "average_rr": None,
            "average_hold_minutes": None,
            "best_pair": None,
            "worst_pair": None,
            "best_session": None,
            "worst_session": None,
            "total_trades": 0,
        }

    now = datetime.now(timezone.utc)
    daily_pnl = sum(t.pnl or 0 for t in trades if t.closed_at and t.closed_at >= now - timedelta(days=1))
    weekly_pnl = sum(t.pnl or 0 for t in trades if t.closed_at and t.closed_at >= now - timedelta(days=7))
    monthly_pnl = sum(t.pnl or 0 for t in trades if t.closed_at and t.closed_at >= now - timedelta(days=30))

    wins = [t for t in trades if (t.pnl or 0) > 0]
    win_rate = round(len(wins) / len(trades) * 100, 2)

    rr_values = []
    hold_minutes = []
    pair_pnl = defaultdict(float)
    session_pnl = defaultdict(float)

    for t in trades:
        pair_pnl[t.symbol] += t.pnl or 0
        if t.opened_at and t.closed_at:
            minutes = (t.closed_at - t.opened_at).total_seconds() / 60
            hold_minutes.append(minutes)
            session_pnl[_session_for_hour(t.opened_at.hour)] += t.pnl or 0
        if t.stop_loss and t.entry_price:
            risk = abs(t.entry_price - t.stop_loss)
            reward = abs((t.exit_price or t.entry_price) - t.entry_price)
            if risk > 0:
                rr_values.append(reward / risk)

    best_pair = max(pair_pnl.items(), key=lambda x: x[1], default=(None, 0))
    worst_pair = min(pair_pnl.items(), key=lambda x: x[1], default=(None, 0))
    best_session = max(session_pnl.items(), key=lambda x: x[1], default=(None, 0))
    worst_session = min(session_pnl.items(), key=lambda x: x[1], default=(None, 0))

    return {
        "daily_pnl": round(daily_pnl, 2),
        "weekly_pnl": round(weekly_pnl, 2),
        "monthly_pnl": round(monthly_pnl, 2),
        "overall_win_rate": win_rate,
        "average_rr": round(sum(rr_values) / len(rr_values), 2) if rr_values else None,
        "average_hold_minutes": round(sum(hold_minutes) / len(hold_minutes), 1) if hold_minutes else None,
        "best_pair": {"symbol": best_pair[0], "pnl": round(best_pair[1], 2)} if best_pair[0] else None,
        "worst_pair": {"symbol": worst_pair[0], "pnl": round(worst_pair[1], 2)} if worst_pair[0] else None,
        "best_session": {"session": best_session[0], "pnl": round(best_session[1], 2)} if best_session[0] else None,
        "worst_session": {"session": worst_session[0], "pnl": round(worst_session[1], 2)} if worst_session[0] else None,
        "total_trades": len(trades),
    }
