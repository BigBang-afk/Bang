"""Monthly calendar heatmap: each day cell colored/intensified by that day's P/L."""
import calendar
from datetime import date

import customtkinter as ctk

from app.ui import theme

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class CalendarHeatmap(ctk.CTkFrame):
    def __init__(self, master, on_day_click=None, **kwargs):
        super().__init__(master, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                         border_width=1, border_color=theme.BORDER, **kwargs)
        self.on_day_click = on_day_click
        self.year, self.month = date.today().year, date.today().month

        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=16, pady=(14, 4))
        ctk.CTkButton(header, text="‹", width=32, fg_color=theme.BG_INPUT, hover_color=theme.BG_CARD_HOVER,
                     text_color=theme.GOLD, command=self._prev).pack(side="left")
        self.title_label = ctk.CTkLabel(header, text="", font=theme.Fonts.get("h3"),
                                        text_color=theme.TEXT_PRIMARY)
        self.title_label.pack(side="left", expand=True, fill="x")
        ctk.CTkButton(header, text="›", width=32, fg_color=theme.BG_INPUT, hover_color=theme.BG_CARD_HOVER,
                     text_color=theme.GOLD, command=self._next).pack(side="right")

        self.grid_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.grid_frame.pack(fill="both", expand=True, padx=12, pady=(0, 14))
        for i in range(7):
            self.grid_frame.grid_columnconfigure(i, weight=1, uniform="day")

        self.pl_by_date = {}
        self._render()

    def set_data(self, pl_by_date: dict):
        self.pl_by_date = pl_by_date
        self._render()

    def _prev(self):
        self.month -= 1
        if self.month == 0:
            self.month, self.year = 12, self.year - 1
        self._render()

    def _next(self):
        self.month += 1
        if self.month == 13:
            self.month, self.year = 1, self.year + 1
        self._render()

    def _color_for_pl(self, pl):
        if pl is None:
            return theme.BG_INPUT, theme.TEXT_MUTED
        if pl > 0:
            intensity = min(1.0, abs(pl) / 200.0)
            return self._blend(theme.GREEN_SOFT, theme.GREEN, intensity), theme.GREEN
        if pl < 0:
            intensity = min(1.0, abs(pl) / 200.0)
            return self._blend(theme.RED_SOFT, theme.RED, intensity), theme.RED
        return theme.BG_INPUT, theme.TEXT_SECONDARY

    @staticmethod
    def _blend(hex1, hex2, t):
        c1 = tuple(int(hex1[i:i + 2], 16) for i in (1, 3, 5))
        c2 = tuple(int(hex2[i:i + 2], 16) for i in (1, 3, 5))
        blended = tuple(int(c1[i] + (c2[i] - c1[i]) * t * 0.55) for i in range(3))
        return f"#{blended[0]:02x}{blended[1]:02x}{blended[2]:02x}"

    def _render(self):
        for w in self.grid_frame.winfo_children():
            w.destroy()

        self.title_label.configure(text=f"{calendar.month_name[self.month]} {self.year}")

        for i, wd in enumerate(WEEKDAYS):
            ctk.CTkLabel(self.grid_frame, text=wd, font=theme.Fonts.get("small_bold"),
                        text_color=theme.TEXT_MUTED).grid(row=0, column=i, pady=(0, 6))

        cal = calendar.Calendar(firstweekday=0)
        weeks = cal.monthdayscalendar(self.year, self.month)
        today_str = date.today().isoformat()

        for r, week in enumerate(weeks, start=1):
            for c, day in enumerate(week):
                if day == 0:
                    ctk.CTkFrame(self.grid_frame, fg_color="transparent", height=52).grid(
                        row=r, column=c, sticky="nsew", padx=3, pady=3)
                    continue
                date_str = f"{self.year:04d}-{self.month:02d}-{day:02d}"
                pl = self.pl_by_date.get(date_str)
                bg, fg = self._color_for_pl(pl)
                border = theme.GOLD if date_str == today_str else theme.BORDER
                cell = ctk.CTkFrame(self.grid_frame, fg_color=bg, corner_radius=8, height=52,
                                    border_width=1, border_color=border)
                cell.grid(row=r, column=c, sticky="nsew", padx=3, pady=3)
                cell.grid_propagate(False)
                ctk.CTkLabel(cell, text=str(day), font=theme.Fonts.get("small_bold"),
                            text_color=theme.TEXT_PRIMARY).place(x=6, y=2)
                if pl is not None:
                    ctk.CTkLabel(cell, text=f"{pl:+.0f}", font=theme.Fonts.get("small"),
                                text_color=fg).place(x=6, y=22)
                cell.bind("<Button-1>", lambda e, d=date_str: self.on_day_click and self.on_day_click(d))
                for child in cell.winfo_children():
                    child.bind("<Button-1>", lambda e, d=date_str: self.on_day_click and self.on_day_click(d))
