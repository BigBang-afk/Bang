"""AI Analysis: transparent, rule-based insight report over the whole journal."""
import customtkinter as ctk

from app.services.ai_analysis import analyze
from app.ui import theme
from app.ui.widgets.common import BasePage, gold_button

SEVERITY_COLOR = {
    "good": theme.GREEN, "info": theme.GOLD, "warning": theme.AMBER, "critical": theme.RED,
}
SEVERITY_ICON = {"good": "✓", "info": "ℹ", "warning": "⚠", "critical": "✕"}


class AIAnalysisPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "AI Analysis", "Rule-based insight engine: mistakes, edges, timing & psychology",
                         actions=[lambda m: gold_button(m, "Refresh Analysis", command=self.refresh)])
        self.holder = ctk.CTkFrame(self.body, fg_color="transparent")
        self.holder.pack(fill="both", expand=True)

    def refresh(self, **_):
        for w in self.holder.winfo_children():
            w.destroy()
        account = self.app.get_active_account()
        if not account:
            return
        trades = self.app.repos.trades.find(account_id=account["id"])
        strategies_map = {s["id"]: s["name"] for s in self.app.repos.strategies.all()}
        tags_by_trade = {
            t["id"]: [tag["name"] for tag in self.app.repos.tags.tags_for_trade(t["id"])] for t in trades
        }
        insights = analyze(trades, strategies_map, tags_by_trade, account["starting_balance"],
                           account["current_balance"])

        by_category = {}
        for ins in insights:
            by_category.setdefault(ins.category, []).append(ins)

        for category, items in by_category.items():
            ctk.CTkLabel(self.holder, text=category.upper(), font=theme.Fonts.get("h3"),
                        text_color=theme.TEXT_PRIMARY).pack(anchor="w", pady=(14, 6))
            for ins in items:
                color = SEVERITY_COLOR.get(ins.severity, theme.GOLD)
                card = ctk.CTkFrame(self.holder, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                                    border_width=1, border_color=theme.BORDER)
                card.pack(fill="x", pady=4)
                top = ctk.CTkFrame(card, fg_color="transparent")
                top.pack(fill="x", padx=16, pady=(12, 2))
                ctk.CTkLabel(top, text=SEVERITY_ICON.get(ins.severity, "•"), font=theme.Fonts.get("h3"),
                            text_color=color).pack(side="left", padx=(0, 8))
                ctk.CTkLabel(top, text=ins.title, font=theme.Fonts.get("body_bold"),
                            text_color=theme.TEXT_PRIMARY).pack(side="left")
                ctk.CTkLabel(card, text=ins.detail, font=theme.Fonts.get("small"), text_color=theme.TEXT_SECONDARY,
                            wraplength=900, justify="left", anchor="w").pack(fill="x", padx=16, pady=(0, 12))
