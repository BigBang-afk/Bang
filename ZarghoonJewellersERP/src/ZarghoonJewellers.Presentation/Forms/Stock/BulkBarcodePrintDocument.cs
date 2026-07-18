using System.Drawing.Printing;
using ZarghoonJewellers.Common.Helpers;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>Prints one barcode label per page for a whole batch of newly-created stock items -
/// used right after Bulk Stock Entry's "Save All" so the cashier can walk away with printed
/// tags for every item instead of opening the barcode dialog 100 times.</summary>
public class BulkBarcodePrintDocument : PrintDocument
{
    private readonly List<(string ItemName, string ItemCode, string BarcodeValue)> _labels;
    private int _cursor;

    public BulkBarcodePrintDocument(IEnumerable<(string ItemName, string ItemCode, string BarcodeValue)> labels)
    {
        _labels = labels.ToList();
    }

    protected override void OnBeginPrint(PrintEventArgs e)
    {
        base.OnBeginPrint(e);
        _cursor = 0;
    }

    protected override void OnPrintPage(PrintPageEventArgs e)
    {
        var graphics = e.Graphics!;
        var bounds = e.MarginBounds;
        var (itemName, itemCode, barcodeValue) = _labels[_cursor];

        using var titleFont = new Font("Segoe UI", 12, FontStyle.Bold);
        using var codeFont = new Font("Segoe UI", 9);

        graphics.DrawString(itemName, titleFont, Brushes.Black, bounds.Left, bounds.Top);
        graphics.DrawString($"Item Code: {itemCode}", codeFont, Brushes.Black, bounds.Left, bounds.Top + 24);

        using var barcodeImage = BarcodeHelper.GenerateBarcode(barcodeValue, "Code128", 320, 110);
        graphics.DrawImage(barcodeImage, bounds.Left, bounds.Top + 50, 320, 110);

        using var qrImage = BarcodeHelper.GenerateBarcode(barcodeValue, "QR", 110, 110);
        graphics.DrawImage(qrImage, bounds.Left + 340, bounds.Top + 50, 110, 110);

        _cursor++;
        e.HasMorePages = _cursor < _labels.Count;
    }
}
