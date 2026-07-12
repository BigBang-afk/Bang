"""Black & gold institutional design system for AURUM Terminal."""
import customtkinter as ctk

# ---------------------------------------------------------------- palette --
BG_APP = "#07070A"
BG_SIDEBAR = "#0C0C10"
BG_PANEL = "#121216"
BG_CARD = "#16161C"
BG_CARD_HOVER = "#1C1C24"
BG_INPUT = "#1A1A20"
BORDER = "#26262E"
BORDER_LIGHT = "#33333D"

GOLD = "#D4AF37"
GOLD_BRIGHT = "#F4D06F"
GOLD_DIM = "#8A7128"
GOLD_SOFT_BG = "#241F10"

TEXT_PRIMARY = "#F2F0EA"
TEXT_SECONDARY = "#9A9AA5"
TEXT_MUTED = "#5F5F6B"

GREEN = "#22C55E"
GREEN_SOFT = "#0F2A1B"
RED = "#EF4444"
RED_SOFT = "#2A1414"
BLUE = "#3B82F6"
AMBER = "#F59E0B"
PURPLE = "#A78BFA"

FONT_FAMILY = "Segoe UI"
FONT_MONO = "Consolas"

RADIUS = 14
RADIUS_SM = 8


def pl_color(value):
    if value is None:
        return TEXT_SECONDARY
    try:
        v = float(value)
    except (TypeError, ValueError):
        return TEXT_SECONDARY
    if v > 0:
        return GREEN
    if v < 0:
        return RED
    return TEXT_SECONDARY


def font(size=13, weight="normal", family=FONT_FAMILY):
    return ctk.CTkFont(family=family, size=size, weight=weight)


def apply_appearance():
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("dark-blue")


class Fonts:
    """Lazily constructed once a CTk root exists (fonts require a Tk root)."""
    _cache = {}

    @classmethod
    def get(cls, key):
        if key not in cls._cache:
            specs = {
                "h1": (26, "bold"),
                "h2": (20, "bold"),
                "h3": (16, "bold"),
                "body": (13, "normal"),
                "body_bold": (13, "bold"),
                "small": (11, "normal"),
                "small_bold": (11, "bold"),
                "kpi": (24, "bold"),
                "kpi_sm": (18, "bold"),
                "mono": (12, "normal"),
                "nav": (13, "normal"),
            }
            size, weight = specs.get(key, (13, "normal"))
            family = FONT_MONO if key == "mono" else FONT_FAMILY
            cls._cache[key] = font(size, weight, family)
        return cls._cache[key]
