"""Daily / weekly / monthly / yearly reports with PDF, Excel, CSV export & print."""
import os
import platform
import subprocess
from datetime import date, timedelta

import customtkinter as ctk

from app.config import EXPORTS_DIR
from app.services.analytics import TradeStats
from app.services.export import export_csv, export_excel, export_pdf_report
from app.ui import theme
from app.ui.widgets.common import BasePage, Card, FormField, gold_button, ghost_button, show_toast
from app.ui.widgets.stat_card import StatCard

PERIODS = ["Daily", "Weekly", "Monthly", "Yearly"]


class ReportsPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Reports", "Generate and export institutional performance reports")
        self._last_pdf_path = None
        self._build()

    def _build(self):
        controls = Card(self.body, title="Report Configuration")
        controls.pack(fill="x", pady=(0, 14))
        row = ctk.CTkFrame(controls, fg_color="transparent")
        row.pack(fill="x", padx=18, pady=(4, 18))
        self.f_period = FormField(row, "Period", kind="dropdown", values=PERIODS, default="Monthly")
        self.f_period.pack(side="left", padx=(0, 12))
        self.f_anchor = FormField(row, "Reference Date (YYYY-MM-DD)", default=date.today().isoformat())
        self.f_anchor.pack(side="left", padx=12)
        gold_button(row, "Generate", command=self.refresh, width=140).pack(side="left", padx=12)

        export_row = ctk.CTkFrame(controls, fg_color="transparent")
        export_row.pack(fill="x", padx=18, pady=(0, 18))
        ghost_button(export_row, "Export CSV", command=self._export_csv, width=130).pack(side="left", padx=(0, 8))
        ghost_button(export_row, "Export Excel", command=self._export_excel, width=130).pack(side="left", padx=8)
        ghost_button(export_row, "Export PDF", command=self._export_pdf, width=130).pack(side="left", padx=8)
        gold_button(export_row, "Print Report", command=self._print_report, width=140).pack(side="left", padx=8)

        self.summary_label = ctk.CTkLabel(self.body, text="", font=theme.Fonts.get("h3"),
                                          text_color=theme.TEXT_PRIMARY, anchor="w")
        self.summary_label.pack(fill="x", pady=(0, 10))

        self.kpi_grid = ctk.CTkFrame(self.body, fg_color="transparent")
        self.kpi_grid.pack(fill="x")
        for i in range(4):
            self.kpi_grid.grid_columnconfigure(i, weight=1, uniform="r")
        self.cards = {}
        for i, key in enumerate(["trades", "win_rate", "net", "pf", "expectancy", "avg_rr", "max_dd", "largest_win"]):
            r, c = divmod(i, 4)
            card = StatCard(self.kpi_grid, key.replace("_", " ").title())
            card.grid(row=r, column=c, sticky="nsew", padx=6, pady=6)
            self.cards[key] = card

    def _period_range(self):
        anchor_str = self.f_anchor.get().strip() or date.today().isoformat()
        try:
            anchor = date.fromisoformat(anchor_str)
        except ValueError:
            anchor = date.today()
        period = self.f_period.get()
        if period == "Daily":
            return anchor, anchor
        if period == "Weekly":
            start = anchor - timedelta(days=anchor.weekday())
            return start, start + timedelta(days=6)
        if period == "Monthly":
            start = anchor.replace(day=1)
            next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
            return start, next_month - timedelta(days=1)
        start = anchor.replace(month=1, day=1)
        end = anchor.replace(month=12, day=31)
        return start, end

    def _current_stats(self):
        account = self.app.get_active_account()
        if not account:
            return None, None, None, None
        start, end = self._period_range()
        trades = self.app.repos.trades.find(account_id=account["id"], date_from=start.isoformat(),
                                            date_to=end.isoformat())
        stats = TradeStats(trades, account["starting_balance"], account["current_balance"])
        return account, stats, start, end

    def refresh(self, **_):
        account, stats, start, end = self._current_stats()
        if not account:
            return
        self.summary_label.configure(
            text=f"{self.f_period.get()} Report — {account['name']} — {start.isoformat()} to {end.isoformat()}")
        values = {
            "trades": (str(stats.total_trades), theme.TEXT_PRIMARY),
            "win_rate": (f"{stats.win_rate:.1f}%", theme.GOLD),
            "net": (f"{stats.net_profit:+.2f}", theme.pl_color(stats.net_profit)),
            "pf": (f"{stats.profit_factor:.2f}", theme.GOLD),
            "expectancy": (f"{stats.expectancy:+.2f}", theme.pl_color(stats.expectancy)),
            "avg_rr": (f"{stats.average_rr:.2f}", theme.GOLD),
            "max_dd": (f"{stats.max_drawdown:.2f}", theme.RED),
            "largest_win": (f"{stats.largest_win:.2f}", theme.GREEN),
        }
        for key, (text, color) in values.items():
            self.cards[key].set_value(text, color)

    def _export_csv(self):
        account, stats, start, end = self._current_stats()
        if not account:
            show_toast(self.app, "No active account.", "error")
            return
        path = os.path.join(EXPORTS_DIR, f"xauusd_{self.f_period.get().lower()}_{start.isoformat()}.csv")
        export_csv(stats.closed, path)
        show_toast(self.app, f"CSV exported to {path}", "success")

    def _export_excel(self):
        account, stats, start, end = self._current_stats()
        if not account:
            show_toast(self.app, "No active account.", "error")
            return
        path = os.path.join(EXPORTS_DIR, f"xauusd_{self.f_period.get().lower()}_{start.isoformat()}.xlsx")
        export_excel(stats.closed, path)
        show_toast(self.app, f"Excel exported to {path}", "success")

    def _export_pdf(self):
        account, stats, start, end = self._current_stats()
        if not account:
            show_toast(self.app, "No active account.", "error")
            return
        path = os.path.join(EXPORTS_DIR, f"xauusd_{self.f_period.get().lower()}_{start.isoformat()}.pdf")
        export_pdf_report(path, f"{self.f_period.get()} Report", account["name"], stats,
                          f"{start.isoformat()} to {end.isoformat()}")
        self._last_pdf_path = path
        show_toast(self.app, f"PDF exported to {path}", "success")

    def _print_report(self):
        self._export_pdf()
        if not self._last_pdf_path:
            return
        try:
            system = platform.system()
            if system == "Windows":
                os.startfile(self._last_pdf_path, "print")
            elif system == "Darwin":
                subprocess.run(["open", self._last_pdf_path], check=False)
            else:
                subprocess.run(["xdg-open", self._last_pdf_path], check=False)
            show_toast(self.app, "Opening report for printing…", "info")
        except Exception:
            show_toast(self.app, f"Report saved to {self._last_pdf_path}. Open it to print.", "info")
