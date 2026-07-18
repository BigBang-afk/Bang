using System.Drawing.Printing;

namespace ZarghoonJewellers.Presentation.Controls;

/// <summary>
/// A small, reusable paginated table printer built on the standard WinForms
/// <see cref="PrintDocument"/>/<see cref="PrintPreviewDialog"/> - used to print the Stock
/// inventory grid (and can be reused for any other grid) without going through a PDF
/// intermediary. Repeats the title and column headers on every page.
/// </summary>
public class TablePrintDocument : PrintDocument
{
    private readonly string _title;
    private readonly IReadOnlyList<string> _headers;
    private readonly IReadOnlyList<string[]> _rows;
    private int _rowCursor;

    private const int RowHeight = 22;
    private const int HeaderHeight = 26;

    public TablePrintDocument(string title, IReadOnlyList<string> headers, IReadOnlyList<string[]> rows)
    {
        _title = title;
        _headers = headers;
        _rows = rows;
        _rowCursor = 0;
    }

    protected override void OnBeginPrint(PrintEventArgs e)
    {
        base.OnBeginPrint(e);
        _rowCursor = 0;
    }

    protected override void OnPrintPage(PrintPageEventArgs e)
    {
        var graphics = e.Graphics!;
        var bounds = e.MarginBounds;
        using var titleFont = new Font("Segoe UI", 14, FontStyle.Bold);
        using var headerFont = new Font("Segoe UI", 9, FontStyle.Bold);
        using var cellFont = new Font("Segoe UI", 8.5f);
        using var headerBrush = new SolidBrush(Color.White);
        using var headerBackBrush = new SolidBrush(Color.Black);
        using var gridPen = new Pen(Color.LightGray);

        float y = bounds.Top;
        graphics.DrawString(_title, titleFont, Brushes.Black, bounds.Left, y);
        y += titleFont.GetHeight(graphics) + 4;
        graphics.DrawString(DateTime.Now.ToString("dd MMM yyyy, hh:mm tt"), cellFont, Brushes.Gray, bounds.Left, y);
        y += 24;

        var columnWidth = (float)bounds.Width / _headers.Count;

        void DrawHeaderRow()
        {
            float x = bounds.Left;
            for (int col = 0; col < _headers.Count; col++)
            {
                graphics.FillRectangle(headerBackBrush, x, y, columnWidth, HeaderHeight);
                graphics.DrawString(_headers[col], headerFont, headerBrush,
                    new RectangleF(x + 2, y + 4, columnWidth - 4, HeaderHeight - 4));
                x += columnWidth;
            }
            y += HeaderHeight;
        }

        DrawHeaderRow();

        while (_rowCursor < _rows.Count)
        {
            if (y + RowHeight > bounds.Bottom)
            {
                e.HasMorePages = true;
                return;
            }

            var row = _rows[_rowCursor];
            float x = bounds.Left;
            for (int col = 0; col < row.Length && col < _headers.Count; col++)
            {
                graphics.DrawString(row[col], cellFont, Brushes.Black,
                    new RectangleF(x + 2, y + 2, columnWidth - 4, RowHeight - 2));
                x += columnWidth;
            }
            graphics.DrawLine(gridPen, bounds.Left, y + RowHeight, bounds.Right, y + RowHeight);

            y += RowHeight;
            _rowCursor++;
        }

        e.HasMorePages = false;
    }
}
