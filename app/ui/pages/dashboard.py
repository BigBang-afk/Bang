"""Institutional overview dashboard: KPIs, curves, heatmap, gauges."""
from datetime import date, timedelta

import customtkinter as ctk

from app.services.analytics import TradeStats, format_minutes
from app.services.risk import RiskEngine
from app.ui import theme
from app.ui.widgets.calendar_heatmap import CalendarHeatmap
from app.ui.widgets.charts import BarChart, LineChart
from app.ui.widgets.common import BasePage
from app.ui.widgets.gauge import Gauge
from app.ui.widgets.stat_card import StatCard


class DashboardPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Dashboard", "Real-time XAUUSD portfolio overview")
        self._build()

    def _build(self):
        self.kpi_grid = ctk.CTkFrame(self.body, fg_color="transparent")
        self.kpi_grid.pack(fill="x", pady=(0, 16))
        for i in range(6):
            self.kpi_grid.grid_columnconfigure(i, weight=1, uniform="kpi")
        self.cards = {}
        self._layout_cards()

        charts_row = ctk.CTkFrame(self.body, fg_color="transparent")
        charts_row.pack(fill="x", pady=(0, 16))
        charts_row.grid_columnconfigure(0, weight=1)
        charts_row.grid_columnconfigure(1, weight=1)
        self.equity_chart = LineChart(charts_row, title="Equity Curve", figsize=(6, 3))
        self.equity_chart.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        self.balance_chart = LineChart(charts_row, title="Balance Curve", figsize=(6, 3))
        self.balance_chart.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        row2 = ctk.CTkFrame(self.body, fg_color="transparent")
        row2.pack(fill="x", pady=(0, 16))
        row2.grid_columnconfigure(0, weight=2)
        row2.grid_columnconfigure(1, weight=1)
        self.heatmap = CalendarHeatmap(row2, on_day_click=self._open_day)
        self.heatmap.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        self.daily_chart = BarChart(row2, title="Daily Performance (last 20 sessions)", figsize=(4.6, 3.2))
        self.daily_chart.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        row3 = ctk.CTkFrame(self.body, fg_color="transparent")
        row3.pack(fill="x", pady=(0, 16))
        row3.grid_columnconfigure(0, weight=1)
        row3.grid_columnconfigure(1, weight=1)
        self.risk_gauge = Gauge(row3, title="Risk Meter", min_val=0, max_val=100, low_is_good=True)
        self.risk_gauge.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        self.perf_gauge = Gauge(row3, title="Performance Score", min_val=0, max_val=100, low_is_good=False)
        self.perf_gauge.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

    def _layout_cards(self):
        specs = [
            ("today_pl", "Today's P/L", "◆"), ("week_pl", "Weekly P/L", "◆"), ("month_pl", "Monthly P/L", "◆"),
            ("total_profit", "Total Profit", "▲"), ("total_loss", "Total Loss", "▼"), ("net_profit", "Net Profit", "◆"),
            ("profit_factor", "Profit Factor", "◆"), ("expectancy", "Expectancy", "◆"), ("avg_rr", "Average RR", "◆"),
            ("win_streak", "Win Streak", "▲"), ("loss_streak", "Loss Streak", "▼"), ("largest_win", "Largest Win", "▲"),
            ("largest_loss", "Largest Loss", "▼"), ("max_dd", "Max Drawdown", "▼"), ("growth", "Account Growth", "◆"),
            ("win_rate", "Win Rate", "◆"), ("total_trades", "Total Trades", "◆"), ("buy_trades", "Buy Trades", "▲"),
            ("sell_trades", "Sell Trades", "▼"), ("avg_hold", "Avg Holding Time", "◆"), ("avg_lot", "Avg Lot Size", "◆"),
            ("best_day", "Best Trading Day", "▲"), ("worst_day", "Worst Trading Day", "▼"), ("balance", "Current Balance", "◆"),
        ]
        for i, (key, label, icon) in enumerate(specs):
            r, c = divmod(i, 6)
            card = StatCard(self.kpi_grid, label, "—", icon=icon)
            card.grid(row=r, column=c, sticky="nsew", padx=6, pady=6)
            self.cards[key] = card

    def _open_day(self, date_str):
        self.app.show_page("calendar", date_str=date_str)

    def refresh(self, **_):
        account = self.app.get_active_account()
        if not account:
            return
        trades = self.app.repos.trades.find(account_id=account["id"])
        stats = TradeStats(trades, account["starting_balance"], account["current_balance"])

        today = date.today()
        week_start = (today - timedelta(days=today.weekday())).isoformat()
        month_start = today.replace(day=1).isoformat()
        today_pl = stats.period_pl(today.isoformat(), today.isoformat())
        week_pl = stats.period_pl(week_start, today.isoformat())
        month_pl = stats.period_pl(month_start, today.isoformat())

        best_day, best_val = stats.best_trading_day
        worst_day, worst_val = stats.worst_trading_day

        values = {
            "today_pl": (f"{today_pl:+.2f}", theme.pl_color(today_pl)),
            "week_pl": (f"{week_pl:+.2f}", theme.pl_color(week_pl)),
            "month_pl": (f"{month_pl:+.2f}", theme.pl_color(month_pl)),
            "total_profit": (f"{stats.total_profit:.2f}", theme.GREEN),
            "total_loss": (f"{stats.total_loss:.2f}", theme.RED),
            "net_profit": (f"{stats.net_profit:+.2f}", theme.pl_color(stats.net_profit)),
            "profit_factor": (f"{stats.profit_factor:.2f}", theme.GOLD),
            "expectancy": (f"{stats.expectancy:+.2f}", theme.pl_color(stats.expectancy)),
            "avg_rr": (f"{stats.average_rr:.2f}", theme.GOLD),
            "win_streak": (str(stats.current_winning_streak), theme.GREEN),
            "loss_streak": (str(stats.current_losing_streak), theme.RED),
            "largest_win": (f"{stats.largest_win:.2f}", theme.GREEN),
            "largest_loss": (f"{stats.largest_loss:.2f}", theme.RED),
            "max_dd": (f"{stats.max_drawdown:.2f} ({stats.max_drawdown_percent:.1f}%)", theme.RED),
            "growth": (f"{stats.account_growth_percent:+.2f}%", theme.pl_color(stats.account_growth_percent)),
            "win_rate": (f"{stats.win_rate:.1f}%", theme.GOLD),
            "total_trades": (str(stats.total_trades), theme.TEXT_PRIMARY),
            "buy_trades": (str(stats.buy_trades), theme.GREEN),
            "sell_trades": (str(stats.sell_trades), theme.RED),
            "avg_hold": (format_minutes(stats.average_holding_minutes), theme.TEXT_PRIMARY),
            "avg_lot": (f"{stats.average_lot_size:.2f}", theme.TEXT_PRIMARY),
            "best_day": (f"{best_day or '—'}", theme.GREEN),
            "worst_day": (f"{worst_day or '—'}", theme.RED),
            "balance": (f"{account['current_balance']:.2f} {account['currency']}", theme.GOLD),
        }
        for key, (text, color) in values.items():
            self.cards[key].set_value(text, color)
        self.cards["best_day"].set_subtitle(f"{best_val:+.2f}" if best_day else "")
        self.cards["worst_day"].set_subtitle(f"{worst_val:+.2f}" if worst_day else "")

        curve = stats.equity_curve()
        xs = list(range(len(curve)))
        ys = [c[1] for c in curve]
        self.equity_chart.plot(xs, ys, color=theme.GOLD)

        bcurve = stats.balance_curve()
        bxs = list(range(len(bcurve)))
        bys = [c[1] for c in bcurve]
        self.balance_chart.plot(bxs, bys, color=theme.BLUE)

        self.heatmap.set_data(stats.by_date())

        by_date = stats.by_date()
        last_days = sorted(by_date.items())[-20:]
        self.daily_chart.plot([d[5:] for d, _ in last_days], [v for _, v in last_days])

        streak = stats.current_losing_streak
        risk_engine = RiskEngine(account, today_pl, week_pl, streak)
        self.risk_gauge.set_value(risk_engine.risk_score, "Composite daily/DD/streak risk")

        perf_score = max(0.0, min(100.0, 50 + stats.expectancy * 2 + (stats.win_rate - 50) * 0.5))
        self.perf_gauge.set_value(perf_score, f"Win rate {stats.win_rate:.0f}% · PF {stats.profit_factor:.2f}")
