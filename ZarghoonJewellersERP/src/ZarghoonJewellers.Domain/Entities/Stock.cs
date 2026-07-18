namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A jewellery/inventory item. <see cref="NetWeight"/> and <see cref="FineGoldWeight"/> are
/// computed columns in SQL; they are mapped as read-only here and recomputed client-side via
/// <see cref="CalculateNetWeight"/>/<see cref="ZarghoonJewellers.Common.Helpers.JewelryCalculator"/>
/// for in-memory (not-yet-saved) instances such as rows in the Quick Stock Entry grid.</summary>
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

    // ---- Identification (added for the full Stock Management module) ----
    public string? DesignNumber { get; set; }
    public string? Brand { get; set; }
    public string? Collection { get; set; }
    public string? Occasion { get; set; }
    public string Gender { get; set; } = "Unisex";
    public string? HallmarkNumber { get; set; }
    public string? SerialNumber { get; set; }
    public string? BatchNumber { get; set; }
    public string? ShelfNumber { get; set; }

    // ---- Costing ----
    public decimal LaborCharges { get; set; }

    /// <summary>Manufacturing wastage percentage applied on top of the purity-adjusted fine weight.</summary>
    public decimal LossPercentage { get; set; }

    /// <summary>Database-computed persisted column: NetWeight adjusted for purity and loss %. Do not set directly.</summary>
    public decimal FineGoldWeight { get; private set; }

    /// <summary>Active / Sold / Reserved / Repair / Melted / Returned - the jewelry-specific lifecycle
    /// state, independent of <see cref="IsActive"/> (which only means "not soft-deleted").</summary>
    public string ItemStatus { get; set; } = "Active";

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
