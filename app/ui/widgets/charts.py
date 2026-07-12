"""Embedded matplotlib chart widgets: equity/balance curves & daily performance bars."""
import customtkinter as ctk
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

from app.ui import theme
from app.ui.widgets.mpl_style import new_figure


class ChartCard(ctk.CTkFrame):
    """Base card that hosts a single matplotlib figure."""

    def __init__(self, master, title="", figsize=(6, 3), **kwargs):
        super().__init__(master, fg_color=theme.BG_CARD, corner_radius=theme.RADIUS,
                         border_width=1, border_color=theme.BORDER, **kwargs)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        if title:
            ctk.CTkLabel(self, text=title.upper(), font=theme.Fonts.get("small_bold"),
                         text_color=theme.TEXT_SECONDARY, anchor="w").grid(
                row=0, column=0, sticky="ew", padx=16, pady=(14, 4))

        self.fig, self.ax = new_figure(figsize=figsize)
        self.canvas = FigureCanvasTkAgg(self.fig, master=self)
        self.canvas.get_tk_widget().configure(bg=theme.BG_CARD, highlightthickness=0)
        self.canvas.get_tk_widget().grid(row=1, column=0, sticky="nsew", padx=12, pady=(0, 12))

    def redraw(self):
        self.canvas.draw_idle()


class LineChart(ChartCard):
    def plot(self, x, y, label="", color=None, fill=True, secondary=None, secondary_label=""):
        self.ax.clear()
        from app.ui.widgets.mpl_style import style_axes
        style_axes(self.fig, self.ax)
        color = color or theme.GOLD
        if not x:
            self.ax.text(0.5, 0.5, "No data yet", ha="center", va="center",
                         color=theme.TEXT_MUTED, transform=self.ax.transAxes)
        else:
            self.ax.plot(x, y, color=color, linewidth=2, label=label)
            if fill:
                self.ax.fill_between(x, y, min(y) if y else 0, color=color, alpha=0.12)
            if secondary is not None:
                self.ax.plot(x, secondary, color=theme.TEXT_SECONDARY, linewidth=1.2,
                             linestyle="--", label=secondary_label)
            if label or secondary_label:
                leg = self.ax.legend(loc="upper left", fontsize=8, facecolor=theme.BG_CARD,
                                     edgecolor=theme.BORDER)
                for text in leg.get_texts():
                    text.set_color(theme.TEXT_SECONDARY)
        self.fig.tight_layout(pad=1.6)
        self.redraw()


class BarChart(ChartCard):
    def plot(self, labels, values, horizontal=False):
        self.ax.clear()
        from app.ui.widgets.mpl_style import style_axes
        style_axes(self.fig, self.ax)
        colors = [theme.GREEN if v >= 0 else theme.RED for v in values]
        if not labels:
            self.ax.text(0.5, 0.5, "No data yet", ha="center", va="center",
                         color=theme.TEXT_MUTED, transform=self.ax.transAxes)
        elif horizontal:
            self.ax.barh(labels, values, color=colors)
        else:
            self.ax.bar(labels, values, color=colors)
            self.ax.tick_params(axis="x", rotation=45)
        self.fig.tight_layout(pad=1.6)
        self.redraw()


class DonutChart(ChartCard):
    def plot(self, labels, values, colors=None):
        self.ax.clear()
        self.ax.set_facecolor(theme.BG_CARD)
        if not values or sum(values) == 0:
            self.ax.text(0.5, 0.5, "No data yet", ha="center", va="center",
                         color=theme.TEXT_MUTED, transform=self.ax.transAxes)
        else:
            colors = colors or [theme.GOLD, theme.BLUE, theme.PURPLE, theme.GREEN, theme.RED, theme.AMBER]
            wedges, _ = self.ax.pie(values, colors=colors[:len(values)], startangle=90,
                                    wedgeprops=dict(width=0.38, edgecolor=theme.BG_CARD))
            self.ax.legend(wedges, labels, loc="center left", bbox_to_anchor=(1, 0.5),
                           fontsize=8, facecolor=theme.BG_CARD, edgecolor=theme.BORDER,
                           labelcolor=theme.TEXT_SECONDARY)
        self.ax.set_aspect("equal")
        self.fig.tight_layout(pad=1.6)
        self.redraw()
