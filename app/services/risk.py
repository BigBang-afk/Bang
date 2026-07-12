"""Risk & position sizing calculators for XAUUSD.

XAUUSD contract convention: 1 standard lot = 100 oz. Price is quoted per
troy ounce, so 1 lot moving $1.00 = $100 P/L, i.e. pip value ($0.01 move)
per standard lot = $1.00 (100 oz * $0.01).
"""

OZ_PER_LOT = 100.0


def pip_value_per_lot(lot_size=1.0):
    """USD value of a $0.01 (1 pip) move for the given lot size."""
    return OZ_PER_LOT * 0.01 * lot_size


def position_size(account_balance, risk_percent, entry_price, stop_loss):
    """Return recommended lot size so that hitting SL loses exactly risk_percent of balance."""
    if entry_price is None or stop_loss is None or entry_price == stop_loss:
        return 0.0
    risk_amount = account_balance * (risk_percent / 100.0)
    price_distance = abs(entry_price - stop_loss)
    if price_distance == 0:
        return 0.0
    loss_per_lot = price_distance * OZ_PER_LOT
    if loss_per_lot == 0:
        return 0.0
    lots = risk_amount / loss_per_lot
    return round(lots, 2)


def risk_amount(account_balance, risk_percent):
    return account_balance * (risk_percent / 100.0)


def compute_rr(entry_price, stop_loss, take_profit, direction="Buy"):
    if entry_price is None or stop_loss is None or take_profit is None:
        return 0.0
    risk = abs(entry_price - stop_loss)
    reward = abs(take_profit - entry_price)
    if risk == 0:
        return 0.0
    return round(reward / risk, 2)


def compute_net_pl(entry_price, exit_price, lot_size, direction, commission=0.0, swap=0.0, spread_cost=0.0):
    if entry_price is None or exit_price is None:
        return 0.0
    diff = (exit_price - entry_price) if direction == "Buy" else (entry_price - exit_price)
    gross = diff * OZ_PER_LOT * lot_size
    net = gross - abs(commission) + swap - abs(spread_cost)
    return round(net, 2)


class RiskEngine:
    """Evaluates an account's live risk posture against its configured limits."""

    def __init__(self, account, today_pl=0.0, week_pl=0.0, current_losing_streak=0, open_risk_percent=0.0):
        self.account = account
        self.today_pl = today_pl
        self.week_pl = week_pl
        self.current_losing_streak = current_losing_streak
        self.open_risk_percent = open_risk_percent

    @property
    def daily_loss_percent_used(self):
        bal = self.account["current_balance"] or 1
        if self.today_pl >= 0:
            return 0.0
        return abs(self.today_pl) / bal * 100.0

    @property
    def overall_loss_percent_used(self):
        start = self.account["starting_balance"] or 1
        drop = start - self.account["current_balance"]
        return max(0.0, drop / start * 100.0)

    @property
    def daily_limit_breached(self):
        limit = self.account["max_daily_loss"] or 0
        return limit > 0 and self.daily_loss_percent_used >= limit

    @property
    def overall_limit_breached(self):
        limit = self.account["max_overall_loss"] or 0
        return limit > 0 and self.overall_loss_percent_used >= limit

    @property
    def risk_score(self):
        """0-100 risk meter: higher = more danger."""
        score = 0.0
        limit = self.account["max_daily_loss"] or 5
        score += min(50.0, (self.daily_loss_percent_used / limit) * 50.0) if limit else 0
        overall_limit = self.account["max_overall_loss"] or 10
        score += min(30.0, (self.overall_loss_percent_used / overall_limit) * 30.0) if overall_limit else 0
        score += min(20.0, self.current_losing_streak * 4.0)
        return round(min(100.0, score), 1)

    def warnings(self):
        msgs = []
        if self.daily_limit_breached:
            msgs.append(f"Daily loss limit breached: {self.daily_loss_percent_used:.2f}% used.")
        elif self.account["max_daily_loss"] and self.daily_loss_percent_used >= self.account["max_daily_loss"] * 0.8:
            msgs.append(f"Approaching daily loss limit ({self.daily_loss_percent_used:.2f}%).")
        if self.overall_limit_breached:
            msgs.append(f"Overall drawdown limit breached: {self.overall_loss_percent_used:.2f}% used.")
        if self.current_losing_streak >= 3:
            msgs.append(f"{self.current_losing_streak} consecutive losses — consider stepping away.")
        return msgs
