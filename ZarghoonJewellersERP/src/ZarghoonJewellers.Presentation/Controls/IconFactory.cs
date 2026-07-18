using System.Drawing.Drawing2D;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Controls;

/// <summary>
/// Generates small circular "letter badge" icons at runtime for the sidebar navigation and
/// stat cards. Avoids bundling an external icon font/image asset pack (and the risk of a
/// glyph rendering as a blank box on a machine that lacks it) by drawing a simple,
/// guaranteed-correct badge with GDI+ instead.
/// </summary>
public static class IconFactory
{
    public static Bitmap CreateBadge(char letter, Color backgroundColor, int size = 28)
    {
        var bitmap = new Bitmap(size, size);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.SmoothingMode = SmoothingMode.AntiAlias;
        graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAlias;

        using var brush = new SolidBrush(backgroundColor);
        graphics.FillEllipse(brush, 0, 0, size - 1, size - 1);

        using var font = new Font("Segoe UI Semibold", size * 0.42f, FontStyle.Bold);
        using var textBrush = new SolidBrush(ThemeColors.TextOnGold);
        var text = letter.ToString();
        var textSize = graphics.MeasureString(text, font);
        graphics.DrawString(text, font, textBrush, (size - textSize.Width) / 2, (size - textSize.Height) / 2 - 1);

        return bitmap;
    }

    /// <summary>A larger rounded-square variant used on the dashboard stat cards.</summary>
    public static Bitmap CreateSquareBadge(char letter, Color backgroundColor, int size = 44)
    {
        var bitmap = new Bitmap(size, size);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.SmoothingMode = SmoothingMode.AntiAlias;

        using var path = RoundedRect(new Rectangle(0, 0, size - 1, size - 1), size / 4);
        using var brush = new SolidBrush(backgroundColor);
        graphics.FillPath(brush, path);

        using var font = new Font("Segoe UI Semibold", size * 0.4f, FontStyle.Bold);
        using var textBrush = new SolidBrush(ThemeColors.TextOnGold);
        var text = letter.ToString();
        var textSize = graphics.MeasureString(text, font);
        graphics.DrawString(text, font, textBrush, (size - textSize.Width) / 2, (size - textSize.Height) / 2 - 1);

        return bitmap;
    }

    private static GraphicsPath RoundedRect(Rectangle bounds, int radius)
    {
        var diameter = radius * 2;
        var path = new GraphicsPath();
        var arc = new Rectangle(bounds.Location, new Size(diameter, diameter));

        path.AddArc(arc, 180, 90);
        arc.X = bounds.Right - diameter;
        path.AddArc(arc, 270, 90);
        arc.Y = bounds.Bottom - diameter;
        path.AddArc(arc, 0, 90);
        arc.X = bounds.Left;
        path.AddArc(arc, 90, 90);
        path.CloseFigure();
        return path;
    }
}
