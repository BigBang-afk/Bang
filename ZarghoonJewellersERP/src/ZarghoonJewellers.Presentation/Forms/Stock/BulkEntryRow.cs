namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>
/// Plain, JSON-friendly snapshot of one row in the Bulk Stock Entry grid - deliberately not an
/// EF entity so it can be freely serialized to the local autosave draft file and so grid rows
/// can be captured/restored for undo/redo without touching the database.
/// </summary>
public class BulkEntryRow
{
    public string ItemName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string SubCategoryName { get; set; } = string.Empty;
    public string MetalType { get; set; } = "Gold";
    public string Purity { get; set; } = "22K";
    public decimal GrossWeight { get; set; }
    public decimal StoneWeight { get; set; }
    public string MakingChargeType { get; set; } = "PerGram";
    public decimal MakingChargeValue { get; set; }
    public decimal LaborCharges { get; set; }
    public decimal StoneValue { get; set; }
    public decimal LossPercentage { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal PurchaseRate { get; set; }
    public decimal SaleRate { get; set; }
    public string KarigarName { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string HallmarkNumber { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public string ShelfNumber { get; set; } = string.Empty;
    public string DesignNumber { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Collection { get; set; } = string.Empty;
    public string Occasion { get; set; } = string.Empty;
    public string Gender { get; set; } = "Unisex";
    public string ItemStatus { get; set; } = "Active";

    public bool IsEffectivelyEmpty()
        => string.IsNullOrWhiteSpace(ItemName) && GrossWeight == 0 && string.IsNullOrWhiteSpace(CategoryName);

    public BulkEntryRow Clone() => (BulkEntryRow)MemberwiseClone();
}
