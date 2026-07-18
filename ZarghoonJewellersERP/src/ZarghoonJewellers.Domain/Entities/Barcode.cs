namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A printable barcode/QR label bound to a specific <see cref="Stock"/> item.</summary>
public class Barcode
{
    public int BarcodeId { get; set; }
    public int StockId { get; set; }
    public string BarcodeValue { get; set; } = string.Empty;
    public string BarcodeType { get; set; } = "Code128";
    public DateTime GeneratedDate { get; set; } = DateTime.Now;
    public bool IsPrinted { get; set; }

    public Stock Stock { get; set; } = null!;
}
