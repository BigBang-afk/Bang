using System.Drawing.Printing;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Controls;

/// <summary>
/// Full-page A4 invoice layout: shop letterhead, customer details box, an itemized table
/// (purity/weights/rate/making/stone/total per line) and a totals summary - the "Invoice
/// Designer"-produced formal document handed to customers who want a proper printed bill
/// rather than a thermal slip.
/// </summary>
public class InvoiceA4PrintDocument : PrintDocument
{
    private readonly Invoice _invoice;
    private readonly string _shopName;
    private readonly string _shopAddress;
    private readonly string _shopPhone;

    public InvoiceA4PrintDocument(Invoice invoice, string shopName, string shopAddress, string shopPhone)
    {
        _invoice = invoice;
        _shopName = shopName;
        _shopAddress = shopAddress;
        _shopPhone = shopPhone;
        DefaultPageSettings.PaperSize = new PaperSize("A4", 827, 1169);
        DefaultPageSettings.Margins = new Margins(50, 50, 50, 50);
    }

    protected override void OnPrintPage(PrintPageEventArgs e)
    {
        var g = e.Graphics!;
        var bounds = e.MarginBounds;
        using var titleFont = new Font("Segoe UI", 20, FontStyle.Bold);
        using var subFont = new Font("Segoe UI", 9);
        using var headingFont = new Font("Segoe UI", 11, FontStyle.Bold);
        using var boldFont = new Font("Segoe UI", 9.5f, FontStyle.Bold);
        using var normalFont = new Font("Segoe UI", 9.5f);
        using var goldBrush = new SolidBrush(ColorTranslator.FromHtml("#B8860B"));
        using var headerBackBrush = new SolidBrush(Color.FromArgb(30, 30, 30));
        using var headerForeBrush = Brushes.White;
        using var gridPen = new Pen(Color.LightGray);
        using var rightFormat = new StringFormat { Alignment = StringAlignment.Far };

        float y = bounds.Top;

        g.DrawString(_shopName, titleFont, goldBrush, bounds.Left, y);
        y += titleFont.GetHeight(g) + 2;
        if (!string.IsNullOrWhiteSpace(_shopAddress)) { g.DrawString(_shopAddress, subFont, Brushes.Black, bounds.Left, y); y += 16; }
        if (!string.IsNullOrWhiteSpace(_shopPhone)) { g.DrawString($"Tel: {_shopPhone}", subFont, Brushes.Black, bounds.Left, y); y += 16; }

        g.DrawString($"{_invoice.InvoiceType.ToUpperInvariant()} INVOICE", headingFont, Brushes.Black,
            new RectangleF(bounds.Left, bounds.Top, bounds.Width, headingFont.GetHeight(g) + 4), rightFormat);
        g.DrawString($"# {_invoice.InvoiceNumber}", boldFont, Brushes.Black,
            new RectangleF(bounds.Left, bounds.Top + 20, bounds.Width, 20), rightFormat);
        g.DrawString(_invoice.InvoiceDate.ToString("dd MMM yyyy, hh:mm tt"), subFont, Brushes.Black,
            new RectangleF(bounds.Left, bounds.Top + 40, bounds.Width, 20), rightFormat);

        y += 16;
        g.DrawLine(new Pen(Color.Black, 1.5f), bounds.Left, y, bounds.Right, y);
        y += 14;

        g.DrawString("BILL TO", boldFont, Brushes.Gray, bounds.Left, y);
        y += 16;
        g.DrawString(_invoice.Customer?.FullName ?? string.Empty, boldFont, Brushes.Black, bounds.Left, y);
        y += 16;
        if (!string.IsNullOrWhiteSpace(_invoice.Customer?.Phone)) { g.DrawString(_invoice.Customer.Phone, normalFont, Brushes.Black, bounds.Left, y); y += 16; }
        if (!string.IsNullOrWhiteSpace(_invoice.Customer?.Address)) { g.DrawString(_invoice.Customer.Address, normalFont, Brushes.Black, bounds.Left, y); y += 16; }

        y += 10;

        string[] headers = { "Item", "Purity", "Gross(g)", "Net(g)", "Rate", "Making", "Stone", "Qty", "Total" };
        float[] colWidths = { 0.24f, 0.08f, 0.09f, 0.09f, 0.11f, 0.11f, 0.09f, 0.06f, 0.13f };
        float tableWidth = bounds.Width;

        void DrawHeaderRow()
        {
            float x = bounds.Left;
            g.FillRectangle(headerBackBrush, bounds.Left, y, tableWidth, 24);
            for (int i = 0; i < headers.Length; i++)
            {
                var w = tableWidth * colWidths[i];
                g.DrawString(headers[i], boldFont, headerForeBrush, new RectangleF(x + 3, y + 4, w - 6, 18));
                x += w;
            }
            y += 24;
        }

        DrawHeaderRow();

        foreach (var d in _invoice.InvoiceDetails)
        {
            if (y + 20 > bounds.Bottom - 160)
            {
                e.HasMorePages = true;
                return;
            }

            float x = bounds.Left;
            string[] cells =
            {
                d.Stock?.ItemName ?? $"Item #{d.StockId}", d.Purity, d.GrossWeight.ToString("N3"), d.NetWeight.ToString("N3"),
                d.Rate.ToString("N0"), d.MakingCharge.ToString("N0"), d.StoneValue.ToString("N0"), d.Quantity.ToString(), d.LineTotal.ToString("N0")
            };
            for (int i = 0; i < cells.Length; i++)
            {
                var w = tableWidth * colWidths[i];
                g.DrawString(cells[i], normalFont, Brushes.Black, new RectangleF(x + 3, y + 3, w - 6, 20));
                x += w;
            }
            g.DrawLine(gridPen, bounds.Left, y + 20, bounds.Right, y + 20);
            y += 20;
        }

        y += 14;
        float labelX = bounds.Right - 220;
        void TotalRow(string label, string value, Font font)
        {
            g.DrawString(label, font, Brushes.Black, labelX, y);
            g.DrawString(value, font, Brushes.Black, new RectangleF(labelX, y, 220, 18), rightFormat);
            y += 20;
        }

        TotalRow("Sub Total", _invoice.SubTotal.ToString("N0"), normalFont);
        TotalRow("Making Charges", _invoice.MakingChargeTotal.ToString("N0"), normalFont);
        if (_invoice.DiscountAmount > 0) TotalRow($"Discount ({_invoice.DiscountPercentage:N1}%)", $"-{_invoice.DiscountAmount:N0}", normalFont);
        if (_invoice.TaxAmount > 0) TotalRow($"Tax/GST ({_invoice.TaxPercentage:N1}%)", _invoice.TaxAmount.ToString("N0"), normalFont);
        g.DrawLine(gridPen, labelX, y, bounds.Right, y);
        y += 6;
        TotalRow("TOTAL", _invoice.TotalAmount.ToString("C0"), headingFont);
        TotalRow("Paid", _invoice.PaidAmount.ToString("N0"), normalFont);
        if (_invoice.BalanceAmount != 0) TotalRow("Balance Due", _invoice.BalanceAmount.ToString("N0"), boldFont);

        y += 20;
        g.DrawString("Thank you for your business. Goods once sold are exchangeable per store policy.", subFont, Brushes.Gray, bounds.Left, bounds.Bottom - 30);

        e.HasMorePages = false;
    }
}
