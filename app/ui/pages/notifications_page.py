"""Notification center: reminders, risk warnings, targets achieved, achievements."""
import customtkinter as ctk

from app.ui import theme
from app.ui.widgets.common import BasePage, ghost_button, show_toast

TYPE_ICON = {
    "reminder": "🔔", "risk": "⚠", "target": "🎯", "achievement": "🏆", "info": "ℹ",
}
TYPE_COLOR = {
    "reminder": theme.GOLD, "risk": theme.RED, "target": theme.GREEN, "achievement": theme.GOLD, "info": theme.BLUE,
}


class NotificationsPage(BasePage):
    def __init__(self, master, app):
        self.app = app
        super().__init__(master, "Notifications", "Reminders, risk warnings & milestone alerts",
                         actions=[lambda m: ghost_button(m, "Mark All Read", command=self._mark_all_read)])
        self.holder = ctk.CTkFrame(self.body, fg_color="transparent")
        self.holder.pack(fill="both", expand=True)

    def _mark_all_read(self):
        self.app.repos.notifications.mark_all_read()
        show_toast(self.app, "All notifications marked as read.", "info")
        self.refresh()

    def refresh(self, **_):
        for w in self.holder.winfo_children():
            w.destroy()
        notifications = self.app.repos.notifications.all(order_by="created_at DESC")
        if not notifications:
            ctk.CTkLabel(self.holder, text="No notifications yet.", font=theme.Fonts.get("body"),
                        text_color=theme.TEXT_MUTED).pack(pady=40)
            return
        for n in notifications:
            unread = not n["is_read"]
            color = TYPE_COLOR.get(n["ntype"], theme.GOLD)
            card = ctk.CTkFrame(self.holder, fg_color=theme.BG_CARD if unread else theme.BG_PANEL,
                                corner_radius=theme.RADIUS_SM, border_width=1,
                                border_color=color if unread else theme.BORDER)
            card.pack(fill="x", pady=4)
            top = ctk.CTkFrame(card, fg_color="transparent")
            top.pack(fill="x", padx=14, pady=(10, 2))
            ctk.CTkLabel(top, text=TYPE_ICON.get(n["ntype"], "•"), font=theme.Fonts.get("h3"),
                        text_color=color).pack(side="left", padx=(0, 8))
            ctk.CTkLabel(top, text=n["title"], font=theme.Fonts.get("body_bold"),
                        text_color=theme.TEXT_PRIMARY).pack(side="left")
            ctk.CTkLabel(top, text=n["created_at"], font=theme.Fonts.get("small"),
                        text_color=theme.TEXT_MUTED).pack(side="right")
            if n["message"]:
                ctk.CTkLabel(card, text=n["message"], font=theme.Fonts.get("small"),
                            text_color=theme.TEXT_SECONDARY, wraplength=900, justify="left",
                            anchor="w").pack(fill="x", padx=14, pady=(0, 10))
            else:
                ctk.CTkFrame(card, fg_color="transparent", height=6).pack()
