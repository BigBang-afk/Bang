"""Goals: daily, weekly, monthly, quarterly & yearly profit targets with progress tracking."""
from datetime import date, timedelta

import customtkinter as ctk

from app.services.analytics import TradeStats
from app.ui import theme
from app.ui.widgets.common import BasePage, Card, FormField, ProgressBarRow, gold_button, show_toast

PERIODS = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"]


def _default_range(period):
    today = date.today()
    if period == "Daily":
        return today, today
    if period == "Weekly":
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6)
    if period == "Monthly":
        start = today.replace(day=1)
        nxt = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        return start, nxt - timedelta(days=1)
    if period == "Quarterly":
        q = (today.month - 1) // 3
        start = today.replace(month=q * 3 + 1, day=1)
        end_month = q * 3 + 3
        end = today.replace(month=end_month, day=28) + timedelta(days=4)
        return start, end.replace(day=1) - timedelta(days=1)
    return today.replace(month=1, day=1), today.replace(month=12, day=31)


class GoalsPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Goals", "Set and track profit targets across every timeframe",
                         actions=[lambda m: gold_button(m, "New Goal", icon="＋", command=self._new_goal)])
        self.holder = ctk.CTkFrame(self.body, fg_color="transparent")
        self.holder.pack(fill="both", expand=True)

    def refresh(self, **_):
        for w in self.holder.winfo_children():
            w.destroy()
        account = self.app.get_active_account()
        if not account:
            return
        trades = self.app.repos.trades.find(account_id=account["id"])
        stats = TradeStats(trades, account["starting_balance"], account["current_balance"])
        goals = self.app.repos.goals.for_account(account["id"])
        if not goals:
            ctk.CTkLabel(self.holder, text="No goals set yet. Click 'New Goal' to define a target.",
                        font=theme.Fonts.get("body"), text_color=theme.TEXT_MUTED).pack(pady=40)
            return
        for g in goals:
            actual = stats.period_pl(g["start_date"], g["end_date"])
            pct = max(0.0, min(100.0, actual / g["target_amount"] * 100.0)) if g["target_amount"] else 0.0
            card = Card(self.holder, title=f"{g['period']} Goal · {g['start_date']} → {g['end_date']}")
            card.pack(fill="x", pady=6)
            ProgressBarRow(card, f"Target {g['target_amount']:.2f} {account['currency']}", pct,
                          f"Actual {actual:+.2f} {account['currency']}",
                          color=theme.GREEN if actual >= g["target_amount"] else theme.GOLD).pack(
                fill="x", padx=18, pady=(4, 18))

    def _new_goal(self):
        dialog = ctk.CTkToplevel(self.app)
        dialog.title("New Goal")
        dialog.geometry("380x360")
        dialog.configure(fg_color=theme.BG_APP)
        dialog.transient(self.app)
        dialog.grab_set()

        form = ctk.CTkFrame(dialog, fg_color="transparent")
        form.pack(fill="both", expand=True, padx=20, pady=20)
        f_period = FormField(form, "Period", kind="dropdown", values=PERIODS, default="Monthly")
        f_period.pack(fill="x", pady=6)
        f_amount = FormField(form, "Target Amount")
        f_amount.pack(fill="x", pady=6)
        start, end = _default_range("Monthly")
        f_start = FormField(form, "Start Date", default=start.isoformat())
        f_start.pack(fill="x", pady=6)
        f_end = FormField(form, "End Date", default=end.isoformat())
        f_end.pack(fill="x", pady=6)

        def on_period_change(*_):
            s, e = _default_range(f_period.get())
            f_start.set(s.isoformat())
            f_end.set(e.isoformat())
        f_period.var.trace_add("write", on_period_change)

        def save():
            account = self.app.get_active_account()
            if not account:
                show_toast(self.app, "No active account.", "error")
                return
            try:
                amount = float(f_amount.get() or 0)
            except ValueError:
                show_toast(self.app, "Enter a valid target amount.", "error")
                return
            self.app.repos.goals.create(account["id"], f_period.get(), amount,
                                        f_start.get().strip(), f_end.get().strip())
            dialog.destroy()
            self.refresh()

        gold_button(form, "Save Goal", command=save, width=340).pack(pady=14)
