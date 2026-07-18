using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.DTOs;

/// <summary>One parsed row from an Excel import: either a ready-to-save <see cref="Stock"/>
/// (when <see cref="Errors"/> is empty) or a list of validation problems to show the user
/// before anything is written to the database.</summary>
public class StockImportRowResult
{
    public int RowNumber { get; set; }
    public Stock? Stock { get; set; }

    /// <summary>The Item Name and Category text exactly as read from the spreadsheet - kept even
    /// when the row fails validation, so the preview grid can show the user what they actually
    /// typed instead of an unresolved id or a blank cell.</summary>
    public string ItemNameRaw { get; set; } = string.Empty;
    public string CategoryNameRaw { get; set; } = string.Empty;

    public List<string> Errors { get; } = new();
    public bool IsValid => Errors.Count == 0;
}

public class StockImportResult
{
    public List<StockImportRowResult> Rows { get; } = new();
    public int ValidCount => Rows.Count(r => r.IsValid);
    public int InvalidCount => Rows.Count(r => !r.IsValid);
}

/// <summary>The exact header names the Stock Excel Import wizard understands. Column order in
/// the spreadsheet does not matter - headers are matched by name (case-insensitive).</summary>
public static class StockImportColumns
{
    public const string ItemName = "ItemName";
    public const string Category = "Category";
    public const string MetalType = "MetalType";
    public const string Purity = "Purity";
    public const string GrossWeight = "GrossWeight";
    public const string StoneWeight = "StoneWeight";
    public const string MakingChargeType = "MakingChargeType";
    public const string MakingChargeValue = "MakingChargeValue";
    public const string LaborCharges = "LaborCharges";
    public const string StoneValue = "StoneValue";
    public const string Quantity = "Quantity";
    public const string PurchaseRate = "PurchaseRate";
    public const string SaleRate = "SaleRate";
    public const string MinimumStockLevel = "MinimumStockLevel";
    public const string LossPercentage = "LossPercentage";
    public const string Karigar = "Karigar";
    public const string Supplier = "Supplier";
    public const string HallmarkNumber = "HallmarkNumber";
    public const string DesignNumber = "DesignNumber";
    public const string Brand = "Brand";
    public const string CollectionName = "Collection";
    public const string Occasion = "Occasion";
    public const string Gender = "Gender";
    public const string ShelfNumber = "ShelfNumber";
    public const string BatchNumber = "BatchNumber";

    public static readonly string[] AllHeaders =
    {
        ItemName, Category, MetalType, Purity, GrossWeight, StoneWeight,
        MakingChargeType, MakingChargeValue, LaborCharges, StoneValue, Quantity,
        PurchaseRate, SaleRate, MinimumStockLevel, LossPercentage,
        Karigar, Supplier, HallmarkNumber, DesignNumber, Brand, CollectionName,
        Occasion, Gender, ShelfNumber, BatchNumber
    };

    public static readonly string[] SampleRow =
    {
        "Gold Ring - Solitaire", "Rings", "Gold", "22K", "5.500", "0.500",
        "PerGram", "800", "50", "0", "1",
        "22000", "24000", "1", "0",
        "", "", "HM-12345", "DR-001", "Zarghoon Classic", "Wedding Collection",
        "Wedding", "Women", "A1", ""
    };
}
