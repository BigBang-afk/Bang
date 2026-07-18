using System.Drawing;

namespace ZarghoonJewellers.Common.Theming;

/// <summary>
/// Single source of truth for the "Dark Luxury Gold" theme used across every form.
/// Keeping the palette here (instead of hard-coded colors sprinkled through the UI)
/// means a future theme change is a one-file edit.
/// </summary>
public static class ThemeColors
{
    // Backgrounds
    public static readonly Color BackgroundDarkest = ColorTranslator.FromHtml("#0D0D0D");
    public static readonly Color BackgroundDark = ColorTranslator.FromHtml("#141414");
    public static readonly Color BackgroundPanel = ColorTranslator.FromHtml("#1B1B1B");
    public static readonly Color BackgroundCard = ColorTranslator.FromHtml("#222222");
    public static readonly Color BackgroundSidebar = ColorTranslator.FromHtml("#111111");
    public static readonly Color BackgroundHover = ColorTranslator.FromHtml("#2A2A2A");

    // Gold accents
    public static readonly Color GoldPrimary = ColorTranslator.FromHtml("#D4AF37");
    public static readonly Color GoldLight = ColorTranslator.FromHtml("#F4E4A1");
    public static readonly Color GoldDark = ColorTranslator.FromHtml("#9C7A1E");
    public static readonly Color GoldGradientStart = ColorTranslator.FromHtml("#B8860B");
    public static readonly Color GoldGradientEnd = ColorTranslator.FromHtml("#F4C430");

    // Text
    public static readonly Color TextPrimary = ColorTranslator.FromHtml("#F5F5F5");
    public static readonly Color TextSecondary = ColorTranslator.FromHtml("#B0B0B0");
    public static readonly Color TextMuted = ColorTranslator.FromHtml("#7A7A7A");
    public static readonly Color TextOnGold = ColorTranslator.FromHtml("#1A1400");

    // Status
    public static readonly Color Success = ColorTranslator.FromHtml("#3DDC84");
    public static readonly Color Danger = ColorTranslator.FromHtml("#E5484D");
    public static readonly Color Warning = ColorTranslator.FromHtml("#F5A623");
    public static readonly Color Info = ColorTranslator.FromHtml("#4FC3F7");

    // Borders / dividers
    public static readonly Color BorderSubtle = ColorTranslator.FromHtml("#2E2A20");
    public static readonly Color BorderGold = GoldPrimary;

    public static readonly Font FontFamilyRegular = new("Segoe UI", 9.5f, FontStyle.Regular);
    public static readonly Font FontFamilyBold = new("Segoe UI Semibold", 10f, FontStyle.Bold);
    public static readonly Font FontHeading = new("Segoe UI Semibold", 16f, FontStyle.Bold);
    public static readonly Font FontStatValue = new("Segoe UI", 20f, FontStyle.Bold);
}
