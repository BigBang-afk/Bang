"""Semicircular gauge (risk meter / performance score) rendered on a Canvas."""
import math
import tkinter as tk

import customtkinter as ctk

from app.ui import theme


class Gauge(ctk.CTkFrame):
    def __init__(self, master, title="Risk Meter", min_val=0, max_val=100, size=220,
                 low_is_good=True, **kwargs):
        super().__init__(master, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                         border_width=1, border_color=theme.BORDER, **kwargs)
        self.min_val, self.max_val = min_val, max_val
        self.size = size
        self.low_is_good = low_is_good
        self.value = min_val

        ctk.CTkLabel(self, text=title.upper(), font=theme.Fonts.get("small_bold"),
                     text_color=theme.TEXT_SECONDARY).pack(pady=(14, 0))

        self.canvas = tk.Canvas(self, width=size, height=size * 0.62, bg=theme.BG_CARD,
                                highlightthickness=0)
        self.canvas.pack(pady=(4, 4))

        self.caption = ctk.CTkLabel(self, text="", font=theme.Fonts.get("small"),
                                     text_color=theme.TEXT_MUTED)
        self.caption.pack(pady=(0, 14))

        self._render(min_val)

    def _color_for(self, pct):
        if self.low_is_good:
            if pct < 0.4:
                return theme.GREEN
            if pct < 0.75:
                return theme.AMBER
            return theme.RED
        else:
            if pct < 0.4:
                return theme.RED
            if pct < 0.75:
                return theme.AMBER
            return theme.GREEN

    def _render(self, value):
        self.canvas.delete("all")
        w, h = self.size, self.size * 0.62
        cx, cy, r = w / 2, h - 6, w / 2 - 18

        self.canvas.create_arc(cx - r, cy - r, cx + r, cy + r, start=180, extent=180,
                               style=tk.ARC, outline=theme.BORDER_LIGHT, width=14)

        pct = max(0.0, min(1.0, (value - self.min_val) / (self.max_val - self.min_val or 1)))
        color = self._color_for(pct)
        extent = 180 * pct
        if extent > 0:
            self.canvas.create_arc(cx - r, cy - r, cx + r, cy + r, start=180, extent=extent,
                                   style=tk.ARC, outline=color, width=14)

        angle = math.radians(180 - extent)
        nx = cx + (r - 22) * math.cos(angle)
        ny = cy - (r - 22) * math.sin(angle)
        self.canvas.create_line(cx, cy, nx, ny, fill=theme.GOLD, width=3)
        self.canvas.create_oval(cx - 6, cy - 6, cx + 6, cy + 6, fill=theme.GOLD, outline="")

        self.canvas.create_text(cx, cy - 30, text=f"{value:.0f}", fill=theme.TEXT_PRIMARY,
                                font=(theme.FONT_FAMILY, 22, "bold"))

    def set_value(self, value, caption=""):
        self.value = max(self.min_val, min(self.max_val, value))
        self._render(self.value)
        self.caption.configure(text=caption)
