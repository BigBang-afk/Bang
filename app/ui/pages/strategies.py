"""Strategy manager: unlimited strategies with live per-strategy performance stats."""
import customtkinter as ctk

from app.services.analytics import TradeStats, format_minutes
from app.ui import theme
from app.ui.widgets.common import BasePage, FormField, gold_button, ghost_button, danger_button, show_toast


class StrategiesPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Strategy Manager", "SMC, ICT, liquidity, order blocks — track every edge",
                         actions=[lambda m: gold_button(m, "New Strategy", icon="＋", command=self._new)])
        self.list_holder = ctk.CTkFrame(self.body, fg_color="transparent")
        self.list_holder.pack(fill="both", expand=True)

    def refresh(self, **_):
        for w in self.list_holder.winfo_children():
            w.destroy()
        account = self.app.get_active_account()
        strategies = self.app.repos.strategies.all(order_by="name")
        for strat in strategies:
            trades = self.app.repos.trades.find(
                account_id=account["id"] if account else None, strategy_id=strat["id"]
            ) if account else []
            stats = TradeStats(trades)
            self._strategy_row(strat, stats).pack(fill="x", pady=6)

    def _strategy_row(self, strat, stats: TradeStats):
        card = ctk.CTkFrame(self.list_holder, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                            border_width=1, border_color=theme.BORDER)
        top = ctk.CTkFrame(card, fg_color="transparent")
        top.pack(fill="x", padx=18, pady=(14, 6))
        ctk.CTkLabel(top, text=strat["name"], font=theme.Fonts.get("h3"),
                     text_color=theme.TEXT_PRIMARY).pack(side="left")
        actions = ctk.CTkFrame(top, fg_color="transparent")
        actions.pack(side="right")
        ghost_button(actions, "Edit", width=70, height=28, command=lambda: self._edit(strat)).pack(side="left", padx=4)
        danger_button(actions, "Delete", width=80, height=28, command=lambda: self._delete(strat)).pack(side="left")

        if strat["description"]:
            ctk.CTkLabel(card, text=strat["description"], font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_SECONDARY, anchor="w").pack(fill="x", padx=18)

        stats_row = ctk.CTkFrame(card, fg_color="transparent")
        stats_row.pack(fill="x", padx=18, pady=(10, 16))
        best_hour, _ = stats.most_profitable_hour
        metrics = [
            ("Trades", str(stats.total_trades)),
            ("Win Rate", f"{stats.win_rate:.1f}%"),
            ("Avg RR", f"{stats.average_rr:.2f}"),
            ("Profit", f"{stats.total_profit:.2f}"),
            ("Loss", f"{stats.total_loss:.2f}"),
            ("Net", f"{stats.net_profit:+.2f}"),
            ("Best Hour", f"{best_hour:02d}:00" if best_hour is not None else "—"),
            ("Avg Hold", format_minutes(stats.average_holding_minutes)),
        ]
        for i, (label, value) in enumerate(metrics):
            box = ctk.CTkFrame(stats_row, fg_color="transparent")
            box.grid(row=0, column=i, sticky="w", padx=(0, 22))
            ctk.CTkLabel(box, text=label.upper(), font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_MUTED).pack(anchor="w")
            color = theme.pl_color(value.replace("%", "").replace("+", "")) if label in ("Profit", "Loss", "Net") \
                else theme.TEXT_PRIMARY
            ctk.CTkLabel(box, text=value, font=theme.Fonts.get("body_bold"), text_color=color).pack(anchor="w")
        return card

    def _new(self):
        self._open_form()

    def _edit(self, strat):
        self._open_form(strat)

    def _delete(self, strat):
        self.app.repos.strategies.delete(strat["id"])
        show_toast(self.app, f"Strategy '{strat['name']}' deleted.", "warning")
        self.refresh()

    def _open_form(self, strat=None):
        dialog = ctk.CTkToplevel(self.app)
        dialog.title("Strategy")
        dialog.geometry("380x300")
        dialog.configure(fg_color=theme.BG_APP)
        dialog.transient(self.app)
        dialog.grab_set()

        form = ctk.CTkFrame(dialog, fg_color="transparent")
        form.pack(fill="both", expand=True, padx=20, pady=20)
        f_name = FormField(form, "Strategy Name", default=strat["name"] if strat else "")
        f_name.pack(fill="x", pady=6)
        f_desc = FormField(form, "Description", kind="textbox", height=100,
                           default=strat["description"] if strat else "")
        f_desc.pack(fill="x", pady=6)

        def save():
            name = f_name.get().strip()
            if not name:
                show_toast(self.app, "Strategy name is required.", "error")
                return
            if strat:
                self.app.repos.strategies.update(strat["id"], name, f_desc.get())
            else:
                self.app.repos.strategies.create(name, f_desc.get())
            dialog.destroy()
            self.refresh()

        gold_button(form, "Save Strategy", command=save, width=340).pack(pady=10)
