namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A single line item within a <see cref="Purchase"/>. <see cref="StockId"/> is null
/// when the line introduces a brand-new item that will be created in <see cref="Stock"/> once confirmed.</summary>
public class PurchaseDetail
{
    public int PurchaseDetailId { get; set; }
    public int PurchaseId { get; set; }
    public int? StockId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Purity { get; set; } = string.Empty;
    public decimal GrossWeight { get; set; }
    public decimal StoneWeight { get; set; }

    /// <summary>Database-computed persisted column (GrossWeight - StoneWeight). Do not set directly.</summary>
    public decimal NetWeight { get; private set; }

    public decimal Rate { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal Amount { get; set; }

    public Purchase Purchase { get; set; } = null!;
    public Stock? Stock { get; set; }
}
