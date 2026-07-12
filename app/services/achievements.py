"""Evaluates trade history against achievement conditions and unlocks badges."""
from collections import defaultdict

from app.database.repository import AchievementRepo, NotificationRepo
from app.services.analytics import TradeStats, _f


def evaluate_achievements(all_trades, starting_balance=0.0, current_balance=0.0):
    stats = TradeStats(all_trades, starting_balance, current_balance)
    achievement_repo = AchievementRepo()
    notif_repo = NotificationRepo()
    newly_unlocked = []

    checks = {
        "first_trade": stats.total_trades >= 1,
        "win_30": len(stats.wins) >= 30,
        "trades_100": stats.total_trades >= 100,
        "trades_1000": stats.total_trades >= 1000,
        "10r_day": _has_10r_day(stats),
        "no_rule_break": _no_rule_break_streak(stats) >= 30,
        "perfect_week": _has_perfect_week(stats),
        "consistency": _has_consistency(stats),
    }

    for key, passed in checks.items():
        if passed and achievement_repo.unlock(key):
            newly_unlocked.append(key)
            row = next((a for a in achievement_repo.all() if a["key"] == key), None)
            name = row["name"] if row else key
            notif_repo.create(f"Achievement Unlocked: {name}", "", ntype="achievement")

    return newly_unlocked


def _has_10r_day(stats: TradeStats):
    by_day_r = defaultdict(float)
    for r in stats.closed:
        rr = _f(r.get("rr_ratio"))
        pl = _f(r.get("profit_loss"))
        by_day_r[r.get("trade_date")] += rr if pl > 0 else (-rr if pl < 0 else 0)
    return any(v >= 10 for v in by_day_r.values())


def _no_rule_break_streak(stats: TradeStats):
    best = cur = 0
    for r in stats.closed:
        if int(r.get("followed_plan") or 0) == 1:
            cur += 1
            best = max(best, cur)
        else:
            cur = 0
    return best


def _has_perfect_week(stats: TradeStats):
    by_date = stats.by_date()
    weeks = defaultdict(list)
    for date_str, pl in by_date.items():
        try:
            from datetime import datetime
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            weeks[dt.strftime("%Y-W%W")].append(pl)
        except (ValueError, TypeError):
            continue
    return any(all(v > 0 for v in vals) and len(vals) >= 3 for vals in weeks.values())


def _has_consistency(stats: TradeStats):
    by_date = stats.by_date()
    weeks = defaultdict(float)
    for date_str, pl in by_date.items():
        try:
            from datetime import datetime
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            weeks[dt.strftime("%Y-W%W")] += pl
        except (ValueError, TypeError):
            continue
    ordered = [v for _, v in sorted(weeks.items())]
    best = cur = 0
    for v in ordered:
        if v > 0:
            cur += 1
            best = max(best, cur)
        else:
            cur = 0
    return best >= 4
