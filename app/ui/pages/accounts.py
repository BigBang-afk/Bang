"""Multi-account management: FTMO, Exness, IC Markets, FundedNext, Personal, ..."""
import customtkinter as ctk

from app.ui import theme
from app.ui.widgets.common import BasePage, Card, FormField, gold_button, ghost_button, danger_button, show_toast


class AccountsPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Accounts", "Manage every prop-firm & personal XAUUSD account",
                         actions=[lambda m: gold_button(m, "New Account", command=self._new_account, icon="＋")])
        self.cards_holder = ctk.CTkFrame(self.body, fg_color="transparent")
        self.cards_holder.pack(fill="both", expand=True)
        self.cards_holder.grid_columnconfigure((0, 1, 2), weight=1)

    def refresh(self, **_):
        for w in self.cards_holder.winfo_children():
            w.destroy()
        accounts = self.app.repos.accounts.all(order_by="name")
        for i, acc in enumerate(accounts):
            r, c = divmod(i, 3)
            self._account_card(acc).grid(row=r, column=c, sticky="nsew", padx=8, pady=8)

    def _account_card(self, acc):
        active = acc["id"] == self.app.active_account_id
        border = theme.GOLD if active else theme.BORDER
        card = ctk.CTkFrame(self.cards_holder, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                            border_width=1.5, border_color=border)

        top = ctk.CTkFrame(card, fg_color="transparent")
        top.pack(fill="x", padx=18, pady=(16, 4))
        ctk.CTkLabel(top, text=acc["name"], font=theme.Fonts.get("h3"),
                     text_color=theme.TEXT_PRIMARY).pack(side="left")
        if active:
            ctk.CTkLabel(top, text="ACTIVE", font=theme.Fonts.get("small_bold"), text_color=theme.GOLD,
                        fg_color=theme.GOLD_SOFT_BG, corner_radius=6, padx=8, pady=2).pack(side="right")

        ctk.CTkLabel(card, text=f"{acc['broker'] or '—'} · {acc['leverage']}", font=theme.Fonts.get("small"),
                    text_color=theme.TEXT_SECONDARY, anchor="w").pack(fill="x", padx=18)

        bal = ctk.CTkLabel(card, text=f"{acc['current_balance']:,.2f} {acc['currency']}",
                           font=theme.Fonts.get("kpi_sm"), text_color=theme.GOLD, anchor="w")
        bal.pack(fill="x", padx=18, pady=(10, 0))
        ctk.CTkLabel(card, text=f"Start: {acc['starting_balance']:,.2f}  ·  Target: {acc['target']:,.2f}",
                    font=theme.Fonts.get("small"), text_color=theme.TEXT_MUTED, anchor="w").pack(fill="x", padx=18)

        limits = ctk.CTkFrame(card, fg_color="transparent")
        limits.pack(fill="x", padx=18, pady=(10, 6))
        ctk.CTkLabel(limits, text=f"Max Daily Loss: {acc['max_daily_loss']}%", font=theme.Fonts.get("small"),
                    text_color=theme.TEXT_SECONDARY, anchor="w").pack(anchor="w")
        ctk.CTkLabel(limits, text=f"Max Overall Loss: {acc['max_overall_loss']}%", font=theme.Fonts.get("small"),
                    text_color=theme.TEXT_SECONDARY, anchor="w").pack(anchor="w")
        ctk.CTkLabel(limits, text=f"Risk / Trade: {acc['risk_percent']}%", font=theme.Fonts.get("small"),
                    text_color=theme.TEXT_SECONDARY, anchor="w").pack(anchor="w")

        actions = ctk.CTkFrame(card, fg_color="transparent")
        actions.pack(fill="x", padx=18, pady=(6, 16))
        if not active:
            gold_button(actions, "Set Active", width=100, height=30,
                       command=lambda: self.app.set_active_account(acc["id"])).pack(side="left", padx=(0, 6))
        ghost_button(actions, "Edit", width=70, height=30,
                    command=lambda: self._edit_account(acc)).pack(side="left", padx=(0, 6))
        danger_button(actions, "Archive", width=90, height=30,
                     command=lambda: self._archive(acc)).pack(side="left")
        return card

    def _archive(self, acc):
        self.app.repos.accounts.update(acc["id"], is_active=0)
        show_toast(self.app, f"{acc['name']} archived.", "warning")
        if self.app.active_account_id == acc["id"]:
            self.app.active_account_id = self.app._resolve_active_account()
            self.app._refresh_account_switcher()
        self.refresh()

    def _new_account(self):
        self._open_form()

    def _edit_account(self, acc):
        self._open_form(acc)

    def _open_form(self, acc=None):
        dialog = ctk.CTkToplevel(self.app)
        dialog.title("Account" if acc else "New Account")
        dialog.geometry("420x640")
        dialog.configure(fg_color=theme.BG_APP)
        dialog.transient(self.app)
        dialog.grab_set()

        form = ctk.CTkScrollableFrame(dialog, fg_color="transparent")
        form.pack(fill="both", expand=True, padx=20, pady=20)

        f_name = FormField(form, "Account Name", default=acc["name"] if acc else "")
        f_name.pack(fill="x", pady=6)
        f_broker = FormField(form, "Broker", default=acc["broker"] if acc else "")
        f_broker.pack(fill="x", pady=6)
        f_currency = FormField(form, "Currency", kind="dropdown", values=["USD", "EUR", "GBP", "AUD", "CAD"],
                               default=acc["currency"] if acc else "USD")
        f_currency.pack(fill="x", pady=6)
        f_leverage = FormField(form, "Leverage", default=acc["leverage"] if acc else "1:100")
        f_leverage.pack(fill="x", pady=6)
        f_start = FormField(form, "Starting Balance", default=acc["starting_balance"] if acc else 10000)
        f_start.pack(fill="x", pady=6)
        f_current = FormField(form, "Current Balance", default=acc["current_balance"] if acc else 10000)
        f_current.pack(fill="x", pady=6)
        f_target = FormField(form, "Target (profit amount)", default=acc["target"] if acc else 0)
        f_target.pack(fill="x", pady=6)
        f_daily = FormField(form, "Max Daily Loss %", default=acc["max_daily_loss"] if acc else 5)
        f_daily.pack(fill="x", pady=6)
        f_overall = FormField(form, "Max Overall Loss %", default=acc["max_overall_loss"] if acc else 10)
        f_overall.pack(fill="x", pady=6)
        f_risk = FormField(form, "Risk % Per Trade", default=acc["risk_percent"] if acc else 1)
        f_risk.pack(fill="x", pady=6)

        def save():
            try:
                data = dict(
                    name=f_name.get().strip(), broker=f_broker.get().strip(), currency=f_currency.get(),
                    leverage=f_leverage.get().strip(), starting_balance=float(f_start.get() or 0),
                    current_balance=float(f_current.get() or 0), target=float(f_target.get() or 0),
                    max_daily_loss=float(f_daily.get() or 0), max_overall_loss=float(f_overall.get() or 0),
                    risk_percent=float(f_risk.get() or 0),
                )
            except ValueError:
                show_toast(self.app, "Please enter valid numeric values.", "error")
                return
            if not data["name"]:
                show_toast(self.app, "Account name is required.", "error")
                return
            if acc:
                self.app.repos.accounts.update(acc["id"], **data)
                show_toast(self.app, "Account updated.", "success")
            else:
                new_id = self.app.repos.accounts.create(**data)
                show_toast(self.app, "Account created.", "success")
                if self.app.active_account_id is None:
                    self.app.set_active_account(new_id)
            dialog.destroy()
            self.app._refresh_account_switcher()
            self.refresh()

        gold_button(form, "Save Account", command=save, width=380).pack(pady=(14, 4))
