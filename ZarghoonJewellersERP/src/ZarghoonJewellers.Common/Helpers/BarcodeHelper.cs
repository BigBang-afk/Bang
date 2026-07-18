using System.Drawing;
using ZXing;
using ZXing.Common;
using ZXing.Windows.Compatibility;

namespace ZarghoonJewellers.Common.Helpers;

/// <summary>
/// Generates scannable barcode/QR images for stock tagging and reads them back during
/// point-of-sale lookup. Built on ZXing.Net (MIT licensed) rather than a hand-rolled
/// symbology encoder - barcode correctness matters for physical inventory tags, so this
/// relies on a widely used, tested implementation instead of reinventing Code128/QR bit
/// tables in-house.
/// </summary>
public static class BarcodeHelper
{
    /// <summary>Renders <paramref name="value"/> as a barcode image of the requested symbology.</summary>
    public static Bitmap GenerateBarcode(string value, string barcodeType, int width = 300, int height = 100)
    {
        var format = barcodeType.ToUpperInvariant() switch
        {
            "CODE128" => BarcodeFormat.CODE_128,
            "CODE39" => BarcodeFormat.CODE_39,
            "EAN13" => BarcodeFormat.EAN_13,
            "QR" => BarcodeFormat.QR_CODE,
            _ => BarcodeFormat.CODE_128
        };

        var writer = new BarcodeWriter
        {
            Format = format,
            Options = new EncodingOptions
            {
                Width = width,
                Height = height,
                Margin = 4,
                PureBarcode = false
            }
        };

        return writer.Write(value);
    }

    /// <summary>Generates a unique, sortable barcode value for a new stock item, e.g. "ZJ-000123-4821".</summary>
    public static string GenerateStockBarcodeValue(int stockId)
    {
        var uniqueSuffix = DateTime.Now.ToString("HHmmss");
        return $"ZJ-{stockId:D6}-{uniqueSuffix}";
    }

    /// <summary>Attempts to decode a barcode value from a scanned/loaded image (used by the POS scan-to-add flow).</summary>
    public static string? TryDecode(Bitmap image)
    {
        var reader = new BarcodeReader { AutoRotate = true, Options = new DecodingOptions { TryHarder = true } };
        var result = reader.Decode(image);
        return result?.Text;
    }
}
