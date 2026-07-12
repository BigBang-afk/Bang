"""Trade log with full search-by and filter-by capability, backed by ttk.Treeview."""
import tkinter as tk
from tkinter import ttk

import customtkinter as ctk

from app.ui import theme
from app.ui.widgets.common import BasePage, FormField, gold_button, ghost_button, danger_button, show_toast

COLUMNS = [
    ("id", "ID", 50), ("trade_date", "Date", 90), ("trade_time", "Time", 60), ("direction", "Dir", 50),
    ("entry_price", "Entry", 75), ("exit_price", "Exit", 75), ("lot_size", "Lots", 55), ("rr_ratio", "RR", 50),
    ("profit_loss", "P/L", 80), ("status", "Status", 80), ("session", "Session", 85), ("strategy", "Strategy", 130),
]


def _style_treeview():
    style = ttk.Style()
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass
    style.configure("Aurum.Treeview", background=theme.BG_CARD, fieldbackground=theme.BG_CARD,
                   foreground=theme.TEXT_PRIMARY, rowheight=28, borderwidth=0, font=(theme.FONT_FAMILY, 11))
    style.map("Aurum.Treeview", background=[("selected", theme.GOLD_SOFT_BG)],
             foreground=[("selected", theme.GOLD)])
    style.configure("Aurum.Treeview.Heading", background=theme.BG_PANEL, foreground=theme.TEXT_SECONDARY,
                   borderwidth=0, font=(theme.FONT_FAMILY, 11, "bold"))
    style.map("Aurum.Treeview.Heading", background=[("active", theme.BG_CARD_HOVER)])


class TradeLogPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        self.sort_state = {"col": "trade_date", "reverse": True}
        super().__init__(master, "Trade Log", "Search, filter and manage every logged execution",
                         actions=[
                             lambda m: gold_button(m, "New Trade", icon="＋",
                                                   command=lambda: app.show_page("trade_entry")),
                         ])
        _style_treeview()
        self._build_filters()
        self._build_table()

    def _build_filters(self):
        bar = ctk.CTkFrame(self.body, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                           border_width=1, border_color=theme.BORDER)
        bar.pack(fill="x", pady=(0, 12))
        row = ctk.CTkFrame(bar, fg_color="transparent")
        row.pack(fill="x", padx=14, pady=12)

        self.f_keyword = FormField(row, "Search (ID, notes, mistakes...)", width=220)
        self.f_keyword.pack(side="left", padx=(0, 10))
        self.f_direction = FormField(row, "Direction", kind="dropdown", values=["All", "Buy", "Sell"], width=100)
        self.f_direction.pack(side="left", padx=10)
        self.f_status = FormField(row, "Status", kind="dropdown",
                                  values=["All", "Open", "Closed", "Partial", "Breakeven"], width=110)
        self.f_status.pack(side="left", padx=10)
        self.f_result = FormField(row, "Result", kind="dropdown", values=["All", "Winning", "Losing"], width=100)
        self.f_result.pack(side="left", padx=10)
        self.f_session = FormField(row, "Session", kind="dropdown",
                                   values=["All", "London", "New York", "Asian", "Kill Zone"], width=110)
        self.f_session.pack(side="left", padx=10)

        strategies = self.app.repos.strategies.all(order_by="name")
        self._strategy_lookup = {s["name"]: s["id"] for s in strategies}
        self.f_strategy = FormField(row, "Strategy", kind="dropdown",
                                    values=["All"] + [s["name"] for s in strategies], width=140)
        self.f_strategy.pack(side="left", padx=10)

        row2 = ctk.CTkFrame(bar, fg_color="transparent")
        row2.pack(fill="x", padx=14, pady=(0, 12))
        self.f_from = FormField(row2, "From (YYYY-MM-DD)", width=140)
        self.f_from.pack(side="left", padx=(0, 10))
        self.f_to = FormField(row2, "To (YYYY-MM-DD)", width=140)
        self.f_to.pack(side="left", padx=10)
        gold_button(row2, "Apply Filters", command=self.refresh, width=130).pack(side="left", padx=10)
        ghost_button(row2, "Reset", command=self._reset_filters, width=90).pack(side="left")
        self.count_label = ctk.CTkLabel(row2, text="", font=theme.Fonts.get("small"),
                                        text_color=theme.TEXT_MUTED)
        self.count_label.pack(side="right")

    def _reset_filters(self):
        self.f_keyword.set(""); self.f_direction.set("All"); self.f_status.set("All")
        self.f_result.set("All"); self.f_session.set("All"); self.f_strategy.set("All")
        self.f_from.set(""); self.f_to.set("")
        self.refresh()

    def _build_table(self):
        table_frame = ctk.CTkFrame(self.body, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                                   border_width=1, border_color=theme.BORDER)
        table_frame.pack(fill="both", expand=True)

        cols = [c[0] for c in COLUMNS]
        self.tree = ttk.Treeview(table_frame, columns=cols, show="headings", style="Aurum.Treeview", height=18)
        for key, label, width in COLUMNS:
            self.tree.heading(key, text=label, command=lambda k=key: self._sort_by(k))
            self.tree.column(key, width=width, anchor="center")
        self.tree.tag_configure("win", foreground=theme.GREEN)
        self.tree.tag_configure("loss", foreground=theme.RED)
        self.tree.tag_configure("neutral", foreground=theme.TEXT_SECONDARY)

        vsb = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side="left", fill="both", expand=True, padx=(12, 0), pady=12)
        vsb.pack(side="left", fill="y", pady=12)

        self.tree.bind("<Double-1>", lambda e: self._edit_selected())

        actions = ctk.CTkFrame(table_frame, fg_color="transparent")
        actions.pack(side="left", fill="y", padx=12, pady=12)
        gold_button(actions, "Edit", command=self._edit_selected, width=110).pack(pady=4)
        danger_button(actions, "Delete", command=self._delete_selected, width=110).pack(pady=4)

    def _sort_by(self, key):
        if self.sort_state["col"] == key:
            self.sort_state["reverse"] = not self.sort_state["reverse"]
        else:
            self.sort_state = {"col": key, "reverse": False}
        self.refresh()

    def _selected_trade_id(self):
        sel = self.tree.selection()
        if not sel:
            return None
        return int(self.tree.item(sel[0], "values")[0])

    def _edit_selected(self):
        trade_id = self._selected_trade_id()
        if trade_id:
            self.app.navigate_to_trade(trade_id)

    def _delete_selected(self):
        trade_id = self._selected_trade_id()
        if not trade_id:
            show_toast(self.app, "Select a trade first.", "warning")
            return
        self.app.repos.trades.delete(trade_id)
        show_toast(self.app, f"Trade #{trade_id} deleted.", "warning")
        self.refresh()

    def refresh(self, **_):
        account = self.app.get_active_account()
        for row in self.tree.get_children():
            self.tree.delete(row)
        if not account:
            self.count_label.configure(text="No active account")
            return

        kwargs = dict(account_id=account["id"])
        kw = self.f_keyword.get().strip()
        if kw:
            kwargs["keyword"] = kw
        if self.f_direction.get() != "All":
            kwargs["direction"] = self.f_direction.get()
        if self.f_status.get() != "All":
            kwargs["status"] = self.f_status.get()
        if self.f_session.get() != "All":
            kwargs["session"] = self.f_session.get()
        if self.f_strategy.get() != "All":
            kwargs["strategy_id"] = self._strategy_lookup.get(self.f_strategy.get())
        if self.f_from.get().strip():
            kwargs["date_from"] = self.f_from.get().strip()
        if self.f_to.get().strip():
            kwargs["date_to"] = self.f_to.get().strip()

        trades = self.app.repos.trades.find(**kwargs)
        result_filter = self.f_result.get()
        if result_filter == "Winning":
            trades = [t for t in trades if (t["profit_loss"] or 0) > 0]
        elif result_filter == "Losing":
            trades = [t for t in trades if (t["profit_loss"] or 0) < 0]

        strat_by_id = {s["id"]: s["name"] for s in self.app.repos.strategies.all()}

        key = self.sort_state["col"]
        reverse = self.sort_state["reverse"]
        if key != "strategy":
            trades = sorted(trades, key=lambda t: (t[key] is None, t[key]), reverse=reverse)

        for t in trades:
            pl = t["profit_loss"] or 0
            tag = "win" if pl > 0 else ("loss" if pl < 0 else "neutral")
            strat_name = strat_by_id.get(t["strategy_id"], "—")
            self.tree.insert("", "end", values=(
                t["id"], t["trade_date"], t["trade_time"], t["direction"], f"{t['entry_price']:.2f}",
                f"{t['exit_price']:.2f}" if t["exit_price"] else "—", t["lot_size"], t["rr_ratio"],
                f"{pl:+.2f}", t["status"], t["session"], strat_name,
            ), tags=(tag,))

        self.count_label.configure(text=f"{len(trades)} trades")
