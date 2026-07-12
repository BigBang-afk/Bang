"""Deep statistics suite: risk-adjusted returns, timing edges, streak analysis."""
import customtkinter as ctk

from app.services.analytics import TradeStats
from app.ui import theme
from app.ui.widgets.charts import BarChart
from app.ui.widgets.common import BasePage
from app.ui.widgets.stat_card import StatCard

WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class StatisticsPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Statistics", "Institutional-grade performance analytics for XAUUSD")
        self._build()

    def _build(self):
        self.kpi_grid = ctk.CTkFrame(self.body, fg_color="transparent")
        self.kpi_grid.pack(fill="x", pady=(0, 16))
        for i in range(4):
            self.kpi_grid.grid_columnconfigure(i, weight=1, uniform="s")
        self.cards = {}
        specs = [
            "most_profitable_session", "most_profitable_day", "most_profitable_hour", "best_rr",
            "worst_rr", "average_win", "average_loss", "expectancy",
            "kelly", "profit_factor", "recovery_factor", "sharpe",
            "sortino", "max_dd", "longest_win", "longest_loss",
        ]
        labels = {
            "most_profitable_session": "Most Profitable Session", "most_profitable_day": "Most Profitable Day",
            "most_profitable_hour": "Most Profitable Hour", "best_rr": "Best RR", "worst_rr": "Worst RR",
            "average_win": "Average Win", "average_loss": "Average Loss", "expectancy": "Expectancy",
            "kelly": "Kelly %", "profit_factor": "Profit Factor", "recovery_factor": "Recovery Factor",
            "sharpe": "Sharpe Ratio", "sortino": "Sortino Ratio", "max_dd": "Maximum Drawdown",
            "longest_win": "Longest Win Streak", "longest_loss": "Longest Loss Streak",
        }
        for i, key in enumerate(specs):
            r, c = divmod(i, 4)
            card = StatCard(self.kpi_grid, labels[key])
            card.grid(row=r, column=c, sticky="nsew", padx=6, pady=6)
            self.cards[key] = card

        charts_row = ctk.CTkFrame(self.body, fg_color="transparent")
        charts_row.pack(fill="x")
        charts_row.grid_columnconfigure((0, 1, 2), weight=1)
        self.session_chart = BarChart(charts_row, title="P/L by Session", figsize=(4, 3.2))
        self.session_chart.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        self.weekday_chart = BarChart(charts_row, title="P/L by Weekday", figsize=(4, 3.2))
        self.weekday_chart.grid(row=0, column=1, sticky="nsew", padx=6)
        self.hour_chart = BarChart(charts_row, title="P/L by Hour", figsize=(4, 3.2))
        self.hour_chart.grid(row=0, column=2, sticky="nsew", padx=(6, 0))

    def refresh(self, **_):
        account = self.app.get_active_account()
        if not account:
            return
        trades = self.app.repos.trades.find(account_id=account["id"])
        stats = TradeStats(trades, account["starting_balance"], account["current_balance"])

        session, session_pl = stats.most_profitable_session
        day, day_pl = stats.best_trading_day
        hour, hour_pl = stats.most_profitable_hour

        values = {
            "most_profitable_session": (session or "—", session_pl),
            "most_profitable_day": (day or "—", day_pl),
            "most_profitable_hour": (f"{hour:02d}:00" if hour is not None else "—", hour_pl),
            "best_rr": (f"{stats.best_rr:.2f}", None),
            "worst_rr": (f"{stats.worst_rr:.2f}", None),
            "average_win": (f"{stats.average_win:.2f}", stats.average_win),
            "average_loss": (f"{stats.average_loss:.2f}", stats.average_loss),
            "expectancy": (f"{stats.expectancy:+.2f}", stats.expectancy),
            "kelly": (f"{stats.kelly_percent:.1f}%", stats.kelly_percent),
            "profit_factor": (f"{stats.profit_factor:.2f}", None),
            "recovery_factor": (f"{stats.recovery_factor:.2f}", None),
            "sharpe": (f"{stats.sharpe_ratio:.2f}", stats.sharpe_ratio),
            "sortino": (f"{stats.sortino_ratio:.2f}", stats.sortino_ratio),
            "max_dd": (f"{stats.max_drawdown:.2f} ({stats.max_drawdown_percent:.1f}%)", None),
            "longest_win": (str(stats.longest_win_streak), None),
            "longest_loss": (str(stats.longest_loss_streak), None),
        }
        for key, (text, pl_val) in values.items():
            color = theme.pl_color(pl_val) if pl_val is not None else theme.GOLD
            self.cards[key].set_value(text, color)
        self.cards["max_dd"].set_value(values["max_dd"][0], theme.RED)

        by_session = stats.by_session()
        self.session_chart.plot(list(by_session.keys()), list(by_session.values()))

        by_weekday = stats.by_day_of_week()
        ordered = [(d, by_weekday.get(d, 0)) for d in WEEKDAY_ORDER if d in by_weekday]
        self.weekday_chart.plot([d[:3] for d, _ in ordered], [v for _, v in ordered])

        by_hour = stats.by_hour()
        ordered_hours = sorted(by_hour.items())
        self.hour_chart.plot([f"{h:02d}" for h, _ in ordered_hours], [v for _, v in ordered_hours])
