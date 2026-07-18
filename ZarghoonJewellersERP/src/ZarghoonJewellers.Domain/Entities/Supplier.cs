namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A vendor the shop purchases raw gold or finished stock from.</summary>
public class Supplier
{
    public int SupplierId { get; set; }
    public string SupplierCode { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public decimal OpeningBalance { get; set; }

    /// <summary>Positive = the shop owes the supplier money (payable).</summary>
    public decimal CurrentBalance { get; set; }
    public decimal CurrentGoldBalance { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public ICollection<Stock> StockItems { get; set; } = new List<Stock>();
    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}
