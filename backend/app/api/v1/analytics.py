import statistics

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.trade import Trade, TradeStatus
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/performance")
async def performance_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Trade).where(Trade.user_id == user.id, Trade.status == TradeStatus.CLOSED)
    )
    trades = result.scalars().all()

    if not trades:
        return {
            "total_trades": 0, "win_rate": 0, "profit_factor": 0, "expectancy": 0,
            "sharpe_ratio": 0, "average_win": 0, "average_loss": 0, "max_drawdown_pct": 0,
            "best_pairs": [], "best_hours": [],
        }

    pnls = [float(t.pnl) for t in trades if t.pnl is not None]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]

    win_rate = round(len(wins) / len(pnls) * 100, 2) if pnls else 0
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))
    profit_factor = round(gross_profit / gross_loss, 2) if gross_loss else float("inf") if gross_profit else 0
    expectancy = round(sum(pnls) / len(pnls), 4) if pnls else 0

    returns_pct = [float(t.pnl_percent) for t in trades if t.pnl_percent is not None]
    sharpe = 0.0
    if len(returns_pct) > 1 and statistics.pstdev(returns_pct) > 0:
        sharpe = round((statistics.mean(returns_pct) / statistics.pstdev(returns_pct)) * (len(returns_pct) ** 0.5), 3)

    average_win = round(statistics.mean(wins), 4) if wins else 0
    average_loss = round(statistics.mean(losses), 4) if losses else 0

    equity_curve = []
    running = 0.0
    for p in pnls:
        running += p
        equity_curve.append(running)
    peak = float("-inf")
    max_dd = 0.0
    for eq in equity_curve:
        peak = max(peak, eq)
        if peak > 0:
            max_dd = max(max_dd, (peak - eq) / peak * 100)

    pair_pnl: dict[str, float] = {}
    hour_pnl: dict[int, float] = {}
    for t in trades:
        if t.pnl is None:
            continue
        pair_pnl[t.symbol] = pair_pnl.get(t.symbol, 0) + float(t.pnl)
        hour = t.opened_at.hour
        hour_pnl[hour] = hour_pnl.get(hour, 0) + float(t.pnl)

    best_pairs = sorted(pair_pnl.items(), key=lambda x: x[1], reverse=True)[:5]
    best_hours = sorted(hour_pnl.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "total_trades": len(trades),
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "expectancy": expectancy,
        "sharpe_ratio": sharpe,
        "average_win": average_win,
        "average_loss": average_loss,
        "max_drawdown_pct": round(max_dd, 2),
        "best_pairs": [{"symbol": s, "pnl": round(p, 2)} for s, p in best_pairs],
        "best_hours": [{"hour": h, "pnl": round(p, 2)} for h, p in best_hours],
    }
