using PdfSharp.Drawing;
using PdfSharp.Pdf;

namespace ZarghoonJewellers.Common.Helpers;

/// <summary>
/// Generic tabular PDF export built on PDFsharp 6 (the modern, GDI-free, .NET 8-targeting
/// rewrite). Paginates automatically when a table runs past the bottom margin, repeating the
/// title/column headers on each new page - used for the Stock inventory list and label sheets.
/// </summary>
public static class PdfExportHelper
{
    private const double PageMarginLeft = 30;
    private const double PageMarginTop = 40;
    private const double PageMarginBottom = 40;
    private const double RowHeight = 20;
    private const double HeaderHeight = 24;

    public static void ExportTable(string filePath, string title, IReadOnlyList<string> headers,
        IReadOnlyList<string[]> rows, IReadOnlyList<double>? columnWidths = null)
    {
        var document = new PdfDocument();
        document.Info.Title = title;

        var titleFont = new XFont("Segoe UI", 16, XFontStyleEx.Bold);
        var headerFont = new XFont("Segoe UI", 9, XFontStyleEx.Bold);
        var cellFont = new XFont("Segoe UI", 8.5, XFontStyleEx.Regular);

        var page = document.AddPage();
        page.Orientation = PdfSharp.PageOrientation.Landscape;
        var gfx = XGraphics.FromPdfPage(page);

        double usableWidth = page.Width - (2 * PageMarginLeft);
        var widths = columnWidths ?? EvenWidths(headers.Count, usableWidth);

        double y = DrawPageHeader(gfx, page, title, titleFont, headerFont, headers, widths);

        foreach (var row in rows)
        {
            if (y + RowHeight > page.Height - PageMarginBottom)
            {
                page = document.AddPage();
                page.Orientation = PdfSharp.PageOrientation.Landscape;
                gfx = XGraphics.FromPdfPage(page);
                y = DrawPageHeader(gfx, page, title, titleFont, headerFont, headers, widths);
            }

            double x = PageMarginLeft;
            for (int col = 0; col < row.Length && col < widths.Count; col++)
            {
                gfx.DrawString(row[col] ?? string.Empty, cellFont, XBrushes.Black,
                    new XRect(x + 2, y, widths[col] - 4, RowHeight), XStringFormats.CenterLeft);
                x += widths[col];
            }

            gfx.DrawLine(XPens.LightGray, PageMarginLeft, y + RowHeight, page.Width - PageMarginLeft, y + RowHeight);
            y += RowHeight;
        }

        document.Save(filePath);
    }

    private static double DrawPageHeader(XGraphics gfx, PdfPage page, string title, XFont titleFont, XFont headerFont,
        IReadOnlyList<string> headers, IReadOnlyList<double> widths)
    {
        double y = PageMarginTop;
        gfx.DrawString(title, titleFont, XBrushes.Black, new XPoint(PageMarginLeft, y));
        y += 24;
        gfx.DrawString(DateTime.Now.ToString("dd MMM yyyy, hh:mm tt"), new XFont("Segoe UI", 8, XFontStyleEx.Italic),
            XBrushes.Gray, new XPoint(PageMarginLeft, y));
        y += 20;

        double x = PageMarginLeft;
        for (int col = 0; col < headers.Count; col++)
        {
            gfx.DrawRectangle(XBrushes.Black, x, y, widths[col], HeaderHeight);
            gfx.DrawString(headers[col], headerFont, XBrushes.White,
                new XRect(x + 2, y, widths[col] - 4, HeaderHeight), XStringFormats.Center);
            x += widths[col];
        }

        return y + HeaderHeight;
    }

    private static List<double> EvenWidths(int count, double totalWidth)
    {
        var width = totalWidth / Math.Max(1, count);
        return Enumerable.Repeat(width, count).ToList();
    }
}
