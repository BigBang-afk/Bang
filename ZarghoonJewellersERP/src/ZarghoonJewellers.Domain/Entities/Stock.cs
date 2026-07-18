namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A jewellery/inventory item. <see cref="NetWeight"/> is a computed column in SQL
/// (GrossWeight - StoneWeight); it is mapped as read-only here and recomputed client-side
/// via <see cref="CalculateNetWeight"/> for in-memory (not-yet-saved) instances.</summary>
public class Stock
{
    public int StockId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string MetalType { get; set; } = "Gold";
    public string Purity { get; set; } = "22K";
    public decimal GrossWeight { get; set; }
    public decimal StoneWeight { get; set; }

    /// <summary>Database-computed persisted column (GrossWeight - StoneWeight). Do not set directly.</summary>
    public decimal NetWeight { get; private set; }

    public string MakingChargeType { get; set; } = "PerGram";
    public decimal MakingChargeValue { get; set; }
    public decimal StoneValue { get; set; }
    public int Quantity { get; set; } = 1;
    public string UnitOfMeasure { get; set; } = "Gram";
    public decimal PurchaseRate { get; set; }
    public decimal PurchaseValue { get; set; }
    public decimal SaleRate { get; set; }
    public decimal MinimumStockLevel { get; set; }
    public int? KarigarId { get; set; }
    public int? SupplierId { get; set; }
    public string? VaultLocation { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public StockCategory Category { get; set; } = null!;
    public Karigar? Karigar { get; set; }
    public Supplier? Supplier { get; set; }
    public ICollection<Barcode> Barcodes { get; set; } = new List<Barcode>();
    public ICollection<InvoiceDetail> InvoiceDetails { get; set; } = new List<InvoiceDetail>();
    public ICollection<PurchaseDetail> PurchaseDetails { get; set; } = new List<PurchaseDetail>();

    public decimal CalculateNetWeight() => GrossWeight - StoneWeight;

    /// <summary>True when quantity has fallen to or below <see cref="MinimumStockLevel"/>.</summary>
    public bool IsLowStock => Quantity <= MinimumStockLevel;
}
