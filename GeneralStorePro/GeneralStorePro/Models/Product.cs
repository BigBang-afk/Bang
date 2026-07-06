namespace GeneralStorePro.Models;

public sealed class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Barcode { get; set; }
    public int? CategoryId { get; set; }
    public string Unit { get; set; } = "pcs";
    public decimal PurchasePrice { get; set; }
    public decimal SalePrice { get; set; }
    public double StockQuantity { get; set; }
    public double ReorderLevel { get; set; }
    public bool IsActive { get; set; }
}
