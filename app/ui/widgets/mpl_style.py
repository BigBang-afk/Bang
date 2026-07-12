"""Shared matplotlib styling so every embedded chart matches the black/gold theme."""
import matplotlib
matplotlib.use("Agg")  # backend swapped to TkAgg by embedding widgets; Agg keeps import side-effect free
import matplotlib.pyplot as plt

from app.ui import theme


def style_axes(fig, ax):
    fig.patch.set_facecolor(theme.BG_CARD)
    ax.set_facecolor(theme.BG_CARD)
    for spine in ax.spines.values():
        spine.set_color(theme.BORDER)
    ax.tick_params(colors=theme.TEXT_SECONDARY, labelsize=8)
    ax.xaxis.label.set_color(theme.TEXT_SECONDARY)
    ax.yaxis.label.set_color(theme.TEXT_SECONDARY)
    ax.title.set_color(theme.TEXT_PRIMARY)
    ax.grid(True, color=theme.BORDER, linewidth=0.5, alpha=0.5)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)


def new_figure(figsize=(5, 3), dpi=100):
    fig = plt.Figure(figsize=figsize, dpi=dpi, facecolor=theme.BG_CARD)
    ax = fig.add_subplot(111)
    style_axes(fig, ax)
    fig.tight_layout(pad=1.6)
    return fig, ax
