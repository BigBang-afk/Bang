namespace ZarghoonJewellers.Domain.Entities;

/// <summary>Hierarchical product category (e.g. Rings, Necklaces) supporting an optional parent for sub-categories.</summary>
public class StockCategory
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ParentCategoryId { get; set; }
    public bool IsActive { get; set; } = true;

    public StockCategory? ParentCategory { get; set; }
    public ICollection<StockCategory> ChildCategories { get; set; } = new List<StockCategory>();
    public ICollection<Stock> StockItems { get; set; } = new List<Stock>();
}
