"""Achievement badges: milestones & discipline rewards."""
import customtkinter as ctk

from app.ui import theme
from app.ui.widgets.common import BasePage


class AchievementsPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Achievements", "Milestones earned through disciplined XAUUSD trading")
        self.grid_holder = ctk.CTkFrame(self.body, fg_color="transparent")
        self.grid_holder.pack(fill="both", expand=True)
        for i in range(4):
            self.grid_holder.grid_columnconfigure(i, weight=1, uniform="ach")

    def refresh(self, **_):
        for w in self.grid_holder.winfo_children():
            w.destroy()
        achievements = self.app.repos.achievements.all(order_by="id")
        for i, a in enumerate(achievements):
            r, c = divmod(i, 4)
            unlocked = bool(a["unlocked"])
            border = theme.GOLD if unlocked else theme.BORDER
            fg = theme.BG_CARD if unlocked else theme.BG_PANEL
            card = ctk.CTkFrame(self.grid_holder, fg_color=fg, corner_radius=theme.RADIUS,
                                border_width=1.5, border_color=border)
            card.grid(row=r, column=c, sticky="nsew", padx=6, pady=6)
            icon_color = theme.GOLD if unlocked else theme.TEXT_MUTED
            ctk.CTkLabel(card, text=a["icon"] or "🏅", font=("Segoe UI", 32),
                        text_color=icon_color).pack(pady=(18, 6))
            ctk.CTkLabel(card, text=a["name"], font=theme.Fonts.get("body_bold"),
                        text_color=theme.TEXT_PRIMARY if unlocked else theme.TEXT_MUTED).pack()
            ctk.CTkLabel(card, text=a["description"], font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_SECONDARY if unlocked else theme.TEXT_MUTED,
                        wraplength=200, justify="center").pack(pady=(2, 10), padx=10)
            status = f"Unlocked {a['unlocked_at'][:10]}" if unlocked and a["unlocked_at"] else "Locked"
            ctk.CTkLabel(card, text=status, font=theme.Fonts.get("small_bold"),
                        text_color=theme.GOLD if unlocked else theme.TEXT_MUTED).pack(pady=(0, 16))
