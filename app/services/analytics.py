"""Analytics engine: every KPI, curve and statistic surfaced across the app.

Operates on plain lists of dict-like trade rows so it can be unit tested
without a live UI. All monetary figures are in the account's currency.
"""
import math
import statistics as pystats
from collections import defaultdict
from datetime import datetime


def _to_dict(row):
    return dict(row) if not isinstance(row, dict) else row


def _f(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _dt(row):
    date = row.get("trade_date") or ""
    tm = row.get("trade_time") or "00:00"
    try:
        return datetime.strptime(f"{date} {tm}", "%Y-%m-%d %H:%M")
    except ValueError:
        try:
            return datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            return datetime.min


def _duration_minutes(row):
    ot, ct = row.get("open_time"), row.get("close_time")
    if not ot or not ct:
        return None
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
        try:
            t1 = datetime.strptime(ot, fmt)
            t2 = datetime.strptime(ct, fmt)
            return max((t2 - t1).total_seconds() / 60.0, 0)
        except ValueError:
            continue
    return None


class TradeStats:
    """Computes the full statistics suite for a set of trades."""

    def __init__(self, trades, starting_balance=0.0, current_balance=0.0):
        self.rows = sorted([_to_dict(r) for r in trades], key=_dt)
        self.closed = [r for r in self.rows if r.get("status") in ("Closed", "Partial", "Breakeven")]
        self.starting_balance = starting_balance
        self.current_balance = current_balance

    # ---------- basic counts ----------
    @property
    def total_trades(self):
        return len(self.rows)

    @property
    def buy_trades(self):
        return sum(1 for r in self.rows if r.get("direction") == "Buy")

    @property
    def sell_trades(self):
        return sum(1 for r in self.rows if r.get("direction") == "Sell")

    @property
    def wins(self):
        return [r for r in self.closed if _f(r.get("profit_loss")) > 0]

    @property
    def losses(self):
        return [r for r in self.closed if _f(r.get("profit_loss")) < 0]

    @property
    def breakevens(self):
        return [r for r in self.closed if _f(r.get("profit_loss")) == 0]

    @property
    def win_rate(self):
        if not self.closed:
            return 0.0
        return 100.0 * len(self.wins) / len(self.closed)

    # ---------- P/L ----------
    @property
    def total_profit(self):
        return sum(_f(r.get("profit_loss")) for r in self.wins)

    @property
    def total_loss(self):
        return sum(_f(r.get("profit_loss")) for r in self.losses)

    @property
    def net_profit(self):
        return sum(_f(r.get("profit_loss")) for r in self.closed)

    @property
    def profit_factor(self):
        if self.total_loss == 0:
            return float(self.total_profit > 0) and self.total_profit or 0.0
        return abs(self.total_profit / self.total_loss)

    @property
    def average_win(self):
        return self.total_profit / len(self.wins) if self.wins else 0.0

    @property
    def average_loss(self):
        return self.total_loss / len(self.losses) if self.losses else 0.0

    @property
    def expectancy(self):
        if not self.closed:
            return 0.0
        wr = len(self.wins) / len(self.closed)
        lr = len(self.losses) / len(self.closed)
        return (wr * self.average_win) + (lr * self.average_loss)

    @property
    def average_rr(self):
        vals = [_f(r.get("rr_ratio")) for r in self.closed if _f(r.get("rr_ratio")) > 0]
        return sum(vals) / len(vals) if vals else 0.0

    @property
    def best_rr(self):
        vals = [_f(r.get("rr_ratio")) for r in self.closed]
        return max(vals) if vals else 0.0

    @property
    def worst_rr(self):
        vals = [_f(r.get("rr_ratio")) for r in self.closed]
        return min(vals) if vals else 0.0

    @property
    def largest_win(self):
        return max((_f(r.get("profit_loss")) for r in self.wins), default=0.0)

    @property
    def largest_loss(self):
        return min((_f(r.get("profit_loss")) for r in self.losses), default=0.0)

    @property
    def average_lot_size(self):
        vals = [_f(r.get("lot_size")) for r in self.rows]
        return sum(vals) / len(vals) if vals else 0.0

    # ---------- streaks ----------
    def _streak_series(self):
        return ["W" if _f(r.get("profit_loss")) > 0 else ("L" if _f(r.get("profit_loss")) < 0 else "B")
                for r in self.closed]

    @property
    def current_winning_streak(self):
        s = self._streak_series()
        n = 0
        for outcome in reversed(s):
            if outcome == "W":
                n += 1
            else:
                break
        return n

    @property
    def current_losing_streak(self):
        s = self._streak_series()
        n = 0
        for outcome in reversed(s):
            if outcome == "L":
                n += 1
            else:
                break
        return n

    def _longest(self, target):
        s = self._streak_series()
        best = cur = 0
        for outcome in s:
            cur = cur + 1 if outcome == target else 0
            best = max(best, cur)
        return best

    @property
    def longest_win_streak(self):
        return self._longest("W")

    @property
    def longest_loss_streak(self):
        return self._longest("L")

    @property
    def max_consecutive_losses(self):
        return self.longest_loss_streak

    # ---------- curves & drawdown ----------
    def equity_curve(self):
        """Returns list of (datetime, cumulative_pl) starting from 0."""
        curve = [(None, 0.0)]
        cum = 0.0
        for r in self.closed:
            cum += _f(r.get("profit_loss"))
            curve.append((_dt(r), cum))
        return curve

    def balance_curve(self):
        curve = [(None, self.starting_balance)]
        bal = self.starting_balance
        for r in self.closed:
            bal += _f(r.get("profit_loss"))
            curve.append((_dt(r), bal))
        return curve

    @property
    def max_drawdown(self):
        peak = self.starting_balance
        bal = self.starting_balance
        max_dd = 0.0
        for r in self.closed:
            bal += _f(r.get("profit_loss"))
            peak = max(peak, bal)
            dd = (peak - bal)
            max_dd = max(max_dd, dd)
        return max_dd

    @property
    def max_drawdown_percent(self):
        peak = self.starting_balance
        bal = self.starting_balance
        max_dd_pct = 0.0
        for r in self.closed:
            bal += _f(r.get("profit_loss"))
            peak = max(peak, bal)
            if peak > 0:
                max_dd_pct = max(max_dd_pct, (peak - bal) / peak * 100.0)
        return max_dd_pct

    @property
    def account_growth_percent(self):
        if self.starting_balance == 0:
            return 0.0
        return (self.current_balance - self.starting_balance) / self.starting_balance * 100.0

    @property
    def recovery_factor(self):
        if self.max_drawdown == 0:
            return 0.0
        return self.net_profit / self.max_drawdown

    # ---------- risk-adjusted ----------
    def _daily_returns(self):
        by_day = defaultdict(float)
        for r in self.closed:
            by_day[r.get("trade_date")] += _f(r.get("profit_loss"))
        return list(by_day.values())

    @property
    def sharpe_ratio(self):
        rets = self._daily_returns()
        if len(rets) < 2:
            return 0.0
        mean = pystats.mean(rets)
        sd = pystats.pstdev(rets)
        if sd == 0:
            return 0.0
        return (mean / sd) * math.sqrt(252)

    @property
    def sortino_ratio(self):
        rets = self._daily_returns()
        if len(rets) < 2:
            return 0.0
        mean = pystats.mean(rets)
        downside = [r for r in rets if r < 0]
        if not downside:
            return 0.0
        dd = math.sqrt(sum(r ** 2 for r in downside) / len(downside))
        if dd == 0:
            return 0.0
        return (mean / dd) * math.sqrt(252)

    @property
    def kelly_percent(self):
        if not self.closed or self.average_loss == 0:
            return 0.0
        w = len(self.wins) / len(self.closed)
        r = abs(self.average_win / self.average_loss) if self.average_loss else 0
        if r == 0:
            return 0.0
        k = w - ((1 - w) / r)
        return k * 100.0

    # ---------- time-based breakdowns ----------
    def by_day_of_week(self):
        buckets = defaultdict(list)
        for r in self.closed:
            buckets[_dt(r).strftime("%A")].append(_f(r.get("profit_loss")))
        return {k: sum(v) for k, v in buckets.items()}

    def by_hour(self):
        buckets = defaultdict(list)
        for r in self.closed:
            buckets[_dt(r).hour].append(_f(r.get("profit_loss")))
        return {k: sum(v) for k, v in buckets.items()}

    def by_session(self):
        buckets = defaultdict(list)
        for r in self.closed:
            buckets[r.get("session") or "Unknown"].append(_f(r.get("profit_loss")))
        return {k: sum(v) for k, v in buckets.items()}

    def by_date(self):
        buckets = defaultdict(float)
        for r in self.closed:
            buckets[r.get("trade_date")] += _f(r.get("profit_loss"))
        return dict(buckets)

    @property
    def best_trading_day(self):
        d = self.by_date()
        return max(d.items(), key=lambda kv: kv[1]) if d else (None, 0.0)

    @property
    def worst_trading_day(self):
        d = self.by_date()
        return min(d.items(), key=lambda kv: kv[1]) if d else (None, 0.0)

    @property
    def most_profitable_session(self):
        d = self.by_session()
        return max(d.items(), key=lambda kv: kv[1]) if d else (None, 0.0)

    @property
    def most_profitable_hour(self):
        d = self.by_hour()
        return max(d.items(), key=lambda kv: kv[1]) if d else (None, 0.0)

    @property
    def average_holding_minutes(self):
        durations = [d for d in (_duration_minutes(r) for r in self.closed) if d is not None]
        return sum(durations) / len(durations) if durations else 0.0

    def period_pl(self, date_from, date_to):
        return sum(_f(r.get("profit_loss")) for r in self.closed
                   if r.get("trade_date") and date_from <= r.get("trade_date") <= date_to)

    def strategy_breakdown(self, strategy_names: dict):
        """strategy_names: {id: name}. Returns {name: TradeStats-like dict}."""
        buckets = defaultdict(list)
        for r in self.rows:
            sid = r.get("strategy_id")
            buckets[strategy_names.get(sid, "Unassigned")].append(r)
        result = {}
        for name, rows in buckets.items():
            st = TradeStats(rows, self.starting_balance, self.current_balance)
            result[name] = {
                "trades": st.total_trades,
                "win_rate": st.win_rate,
                "avg_rr": st.average_rr,
                "profit": st.total_profit,
                "loss": st.total_loss,
                "net": st.net_profit,
                "best_hour": st.most_profitable_hour[0],
                "avg_hold": st.average_holding_minutes,
            }
        return result


def format_minutes(minutes):
    if not minutes:
        return "0m"
    h, m = divmod(int(minutes), 60)
    d, h = divmod(h, 24)
    parts = []
    if d:
        parts.append(f"{d}d")
    if h:
        parts.append(f"{h}h")
    parts.append(f"{m}m")
    return " ".join(parts)
