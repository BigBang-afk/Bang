"""KPI stat card used across the Dashboard & Statistics pages."""
import customtkinter as ctk

from app.ui import theme


class StatCard(ctk.CTkFrame):
    def __init__(self, master, label, value="—", icon="", value_color=None, subtitle="", **kwargs):
        super().__init__(
            master, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
            border_width=1, border_color=theme.BORDER, **kwargs
        )
        self._value_color = value_color or theme.TEXT_PRIMARY
        self.grid_columnconfigure(0, weight=1)

        top = ctk.CTkFrame(self, fg_color="transparent")
        top.grid(row=0, column=0, sticky="ew", padx=16, pady=(14, 0))
        top.grid_columnconfigure(0, weight=1)

        if icon:
            ctk.CTkLabel(top, text=icon, font=theme.Fonts.get("h3"), text_color=theme.GOLD_DIM,
                         width=20).grid(row=0, column=1, sticky="e")

        ctk.CTkLabel(top, text=label.upper(), font=theme.Fonts.get("small_bold"),
                     text_color=theme.TEXT_SECONDARY, anchor="w").grid(row=0, column=0, sticky="w")

        self.value_label = ctk.CTkLabel(self, text=str(value), font=theme.Fonts.get("kpi"),
                                         text_color=self._value_color, anchor="w")
        self.value_label.grid(row=1, column=0, sticky="w", padx=16, pady=(2, 2))

        self.subtitle_label = ctk.CTkLabel(self, text=subtitle, font=theme.Fonts.get("small"),
                                            text_color=theme.TEXT_MUTED, anchor="w")
        self.subtitle_label.grid(row=2, column=0, sticky="w", padx=16, pady=(0, 14))

        self.bind("<Enter>", self._on_enter)
        self.bind("<Leave>", self._on_leave)
        for child in (top, self.value_label, self.subtitle_label):
            child.bind("<Enter>", self._on_enter)
            child.bind("<Leave>", self._on_leave)

    def _on_enter(self, _):
        self.configure(border_color=theme.GOLD_DIM, fg_color=theme.BG_CARD_HOVER)

    def _on_leave(self, _):
        self.configure(border_color=theme.BORDER, fg_color=theme.BG_CARD)

    def set_value(self, value, color=None):
        self.value_label.configure(text=str(value), text_color=color or self._value_color)

    def set_subtitle(self, text):
        self.subtitle_label.configure(text=text)
