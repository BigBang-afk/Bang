"""Risk management desk: position sizing, exposure limits, targets, live warnings."""
from datetime import date, timedelta

import customtkinter as ctk

from app.services.analytics import TradeStats
from app.services.risk import RiskEngine, pip_value_per_lot, position_size, risk_amount
from app.ui import theme
from app.ui.widgets.common import BasePage, Card, FormField, ProgressBarRow, gold_button, show_toast
from app.ui.widgets.gauge import Gauge


class RiskPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Risk Management", "Position sizing, exposure limits & discipline guardrails")
        self._build()

    def _build(self):
        top_row = ctk.CTkFrame(self.body, fg_color="transparent")
        top_row.pack(fill="x", pady=(0, 14))
        top_row.grid_columnconfigure(0, weight=2)
        top_row.grid_columnconfigure(1, weight=1)

        self._build_calculator(top_row).grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        self.risk_gauge = Gauge(top_row, title="Risk Meter", min_val=0, max_val=100, low_is_good=True)
        self.risk_gauge.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        mid_row = ctk.CTkFrame(self.body, fg_color="transparent")
        mid_row.pack(fill="x", pady=(0, 14))
        mid_row.grid_columnconfigure((0, 1), weight=1)
        self.limits_card = Card(mid_row, title="Exposure Limits")
        self.limits_card.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        self.targets_card = Card(mid_row, title="Targets")
        self.targets_card.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        self.warnings_card = Card(self.body, title="Auto Warnings")
        self.warnings_card.pack(fill="x")

    def _build_calculator(self, parent):
        card = Card(parent, title="Position Size & Risk Calculator")
        row = ctk.CTkFrame(card, fg_color="transparent")
        row.pack(fill="x", padx=18, pady=(4, 8))
        for i in range(3):
            row.grid_columnconfigure(i, weight=1)
        self.c_entry = FormField(row, "Entry Price")
        self.c_entry.grid(row=0, column=0, sticky="ew", padx=6)
        self.c_sl = FormField(row, "Stop Loss")
        self.c_sl.grid(row=0, column=1, sticky="ew", padx=6)
        account = self.app.get_active_account()
        self.c_risk = FormField(row, "Risk %", default=account["risk_percent"] if account else 1.0)
        self.c_risk.grid(row=0, column=2, sticky="ew", padx=6)

        gold_button(card, "Calculate Position Size", command=self._calculate, width=240).pack(
            anchor="w", padx=18, pady=(4, 10))

        self.result_frame = ctk.CTkFrame(card, fg_color=theme.BG_INPUT, corner_radius=theme.RADIUS_SM)
        self.result_frame.pack(fill="x", padx=18, pady=(0, 18))
        self.result_labels = {}
        for i, key in enumerate(["Recommended Lot Size", "Risk Amount", "Pip Value / Lot", "Distance to SL"]):
            box = ctk.CTkFrame(self.result_frame, fg_color="transparent")
            box.grid(row=0, column=i, sticky="w", padx=16, pady=14)
            ctk.CTkLabel(box, text=key.upper(), font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_MUTED).pack(anchor="w")
            lbl = ctk.CTkLabel(box, text="—", font=theme.Fonts.get("h3"), text_color=theme.GOLD)
            lbl.pack(anchor="w")
            self.result_labels[key] = lbl
        for i in range(4):
            self.result_frame.grid_columnconfigure(i, weight=1)
        return card

    def _calculate(self):
        account = self.app.get_active_account()
        if not account:
            show_toast(self.app, "No active account.", "error")
            return
        try:
            entry = float(self.c_entry.get() or 0)
            sl = float(self.c_sl.get() or 0)
            risk_pct = float(self.c_risk.get() or 0)
        except ValueError:
            show_toast(self.app, "Enter valid numeric values.", "error")
            return
        lots = position_size(account["current_balance"], risk_pct, entry, sl)
        amount = risk_amount(account["current_balance"], risk_pct)
        pip_val = pip_value_per_lot(lots or 1)
        distance = abs(entry - sl)
        self.result_labels["Recommended Lot Size"].configure(text=f"{lots:.2f}")
        self.result_labels["Risk Amount"].configure(text=f"{amount:.2f} {account['currency']}")
        self.result_labels["Pip Value / Lot"].configure(text=f"{pip_val:.2f}")
        self.result_labels["Distance to SL"].configure(text=f"{distance:.2f}")

    def refresh(self, **_):
        account = self.app.get_active_account()
        for w in self.limits_card.winfo_children()[1:]:
            w.destroy()
        for w in self.targets_card.winfo_children()[1:]:
            w.destroy()
        for w in self.warnings_card.winfo_children()[1:]:
            w.destroy()

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

        engine = RiskEngine(account, today_pl, week_pl, stats.current_losing_streak)

        ProgressBarRow(self.limits_card, "Daily Loss Limit",
                       min(100, engine.daily_loss_percent_used / (account["max_daily_loss"] or 1) * 100),
                       f"{engine.daily_loss_percent_used:.2f}% used of {account['max_daily_loss']}% limit",
                       color=theme.RED if engine.daily_limit_breached else theme.GOLD).pack(
            fill="x", padx=18, pady=8)
        ProgressBarRow(self.limits_card, "Overall Drawdown Limit",
                       min(100, engine.overall_loss_percent_used / (account["max_overall_loss"] or 1) * 100),
                       f"{engine.overall_loss_percent_used:.2f}% used of {account['max_overall_loss']}% limit",
                       color=theme.RED if engine.overall_limit_breached else theme.GOLD).pack(
            fill="x", padx=18, pady=8)
        ProgressBarRow(self.limits_card, "Max Drawdown (all-time)",
                       min(100, stats.max_drawdown_percent),
                       f"{stats.max_drawdown_percent:.2f}% from peak equity",
                       color=theme.RED).pack(fill="x", padx=18, pady=8)
        ProgressBarRow(self.limits_card, "Consecutive Losses",
                       min(100, stats.current_losing_streak / 5 * 100),
                       f"{stats.current_losing_streak} in a row (soft cap 5)",
                       color=theme.AMBER).pack(fill="x", padx=18, pady=(8, 18))

        daily_target = float(self.app.repos.settings.get("daily_target", "0") or 0)
        weekly_target = float(self.app.repos.settings.get("weekly_target", "0") or 0)
        monthly_target = float(self.app.repos.settings.get("monthly_target", "0") or 0)
        overall_target = account["target"] or 0

        def pct(val, target):
            if target <= 0:
                return 0.0
            return max(0.0, min(100.0, val / target * 100.0))

        ProgressBarRow(self.targets_card, "Daily Target", pct(today_pl, daily_target),
                       f"{today_pl:+.2f} / {daily_target:.2f}").pack(fill="x", padx=18, pady=8)
        ProgressBarRow(self.targets_card, "Weekly Target", pct(week_pl, weekly_target),
                       f"{week_pl:+.2f} / {weekly_target:.2f}").pack(fill="x", padx=18, pady=8)
        ProgressBarRow(self.targets_card, "Monthly Target", pct(month_pl, monthly_target),
                       f"{month_pl:+.2f} / {monthly_target:.2f}").pack(fill="x", padx=18, pady=8)
        ProgressBarRow(self.targets_card, "Account Growth Target", pct(stats.net_profit, overall_target),
                       f"{stats.net_profit:+.2f} / {overall_target:.2f}").pack(fill="x", padx=18, pady=(8, 18))

        warnings = engine.warnings()
        if not warnings:
            ctk.CTkLabel(self.warnings_card, text="✓ All risk parameters within limits.",
                        font=theme.Fonts.get("body"), text_color=theme.GREEN).pack(anchor="w", padx=18, pady=14)
        else:
            for msg in warnings:
                row = ctk.CTkFrame(self.warnings_card, fg_color=theme.RED_SOFT, corner_radius=theme.RADIUS_SM)
                row.pack(fill="x", padx=18, pady=4)
                ctk.CTkLabel(row, text=f"⚠  {msg}", font=theme.Fonts.get("body"),
                            text_color=theme.RED).pack(anchor="w", padx=12, pady=8)
            ctk.CTkFrame(self.warnings_card, fg_color="transparent", height=6).pack()

        self.risk_gauge.set_value(engine.risk_score, "Composite daily/DD/streak risk")
