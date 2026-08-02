using System.Drawing.Printing;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Controls;

/// <summary>
/// Narrow-roll receipt layout for 58/80mm thermal printers: shop header, line items, totals
/// and a scannable Code128 barcode of the invoice number at the foot (the "Barcode Receipt"
/// requirement) so a return/lookup can be done by re-scanning the printed slip.
/// </summary>
public class InvoiceThermalPrintDocument : PrintDocument
{
    private readonly Invoice _invoice;
    private readonly string _shopName;
    private readonly string _shopAddress;
    private readonly string _shopPhone;
    private readonly int _paperWidthMm;

    public InvoiceThermalPrintDocument(Invoice invoice, string shopName, string shopAddress, string shopPhone, int paperWidthMm = 80)
    {
        _invoice = invoice;
        _shopName = shopName;
        _shopAddress = shopAddress;
        _shopPhone = shopPhone;
        _paperWidthMm = paperWidthMm;

        var widthHundredthsInch = (int)(paperWidthMm / 25.4 * 100);
        DefaultPageSettings.PaperSize = new PaperSize("Thermal", widthHundredthsInch, 1600);
        DefaultPageSettings.Margins = new Margins(8, 8, 8, 8);
    }

    protected override void OnPrintPage(PrintPageEventArgs e)
    {
        var g = e.Graphics!;
        var bounds = e.MarginBounds;
        using var titleFont = new Font("Segoe UI", 11, FontStyle.Bold);
        using var boldFont = new Font("Segoe UI", 8, FontStyle.Bold);
        using var normalFont = new Font("Segoe UI", 8);
        using var smallFont = new Font("Segoe UI", 7);
        using var centerFormat = new StringFormat { Alignment = StringAlignment.Center };
        using var rightFormat = new StringFormat { Alignment = StringAlignment.Far };
        using var linePen = new Pen(Color.Black) { DashStyle = System.Drawing.Drawing2D.DashStyle.Dash };

        float y = bounds.Top;
        float width = bounds.Width;

        void Center(string text, Font font)
        {
            g.DrawString(text, font, Brushes.Black, new RectangleF(bounds.Left, y, width, font.GetHeight(g) + 4), centerFormat);
            y += font.GetHeight(g) + 2;
        }

        void Divider()
        {
            g.DrawLine(linePen, bounds.Left, y, bounds.Right, y);
            y += 6;
        }

        void RowLR(string left, string right, Font font)
        {
            g.DrawString(left, font, Brushes.Black, bounds.Left, y);
            g.DrawString(right, font, Brushes.Black, new RectangleF(bounds.Left, y, width, font.GetHeight(g) + 4), rightFormat);
            y += font.GetHeight(g) + 3;
        }

        Center(_shopName, titleFont);
        if (!string.IsNullOrWhiteSpace(_shopAddress)) Center(_shopAddress, smallFont);
        if (!string.IsNullOrWhiteSpace(_shopPhone)) Center($"Tel: {_shopPhone}", smallFont);
        y += 2;
        Divider();

        RowLR($"Invoice: {_invoice.InvoiceNumber}", _invoice.InvoiceDate.ToString("dd-MMM-yy HH:mm"), boldFont);
        RowLR($"Customer: {_invoice.Customer?.FullName}", string.Empty, normalFont);
        Divider();

        RowLR("Item", "Amount", boldFont);
        Divider();

        foreach (var d in _invoice.InvoiceDetails)
        {
            var itemName = d.Stock?.ItemName ?? $"Item #{d.StockId}";
            g.DrawString(itemName, normalFont, Brushes.Black, bounds.Left, y);
            y += normalFont.GetHeight(g) + 2;
            RowLR($"  {d.Quantity} x {d.NetWeight:N3}g @ {d.Rate:N0}", d.LineTotal.ToString("N0"), smallFont);
        }

        Divider();
        RowLR("Sub Total", _invoice.SubTotal.ToString("N0"), normalFont);
        RowLR("Making Charges", _invoice.MakingChargeTotal.ToString("N0"), normalFont);
        if (_invoice.DiscountAmount > 0) RowLR("Discount", $"-{_invoice.DiscountAmount:N0}", normalFont);
        if (_invoice.TaxAmount > 0) RowLR($"Tax/GST ({_invoice.TaxPercentage:N1}%)", _invoice.TaxAmount.ToString("N0"), normalFont);
        Divider();
        RowLR("TOTAL", _invoice.TotalAmount.ToString("C0"), titleFont);
        RowLR("Paid", _invoice.PaidAmount.ToString("N0"), normalFont);
        if (_invoice.BalanceAmount != 0) RowLR("Balance Due", _invoice.BalanceAmount.ToString("N0"), boldFont);
        RowLR("Payment Mode", _invoice.PaymentMode, smallFont);
        Divider();

        Center("Thank you for shopping with us!", smallFont);
        y += 6;

        using var barcode = BarcodeHelper.GenerateBarcode(_invoice.InvoiceNumber, "CODE128", (int)width - 20, 60);
        g.DrawImage(barcode, bounds.Left + (width - barcode.Width) / 2, y);
        y += barcode.Height + 4;

        e.HasMorePages = false;
    }
}
