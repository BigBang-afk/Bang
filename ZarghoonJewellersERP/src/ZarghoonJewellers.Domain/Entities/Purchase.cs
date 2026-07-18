namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A purchase transaction recording stock/gold bought from a <see cref="Supplier"/>.</summary>
public class Purchase
{
    public int PurchaseId { get; set; }
    public string PurchaseNumber { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; } = DateTime.Now;
    public int SupplierId { get; set; }
    public decimal GoldRateAtPurchase { get; set; }
    public decimal TotalGrossWeight { get; set; }
    public decimal TotalNetWeight { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }

    /// <summary>Database-computed persisted column (TotalAmount - PaidAmount). Do not set directly.</summary>
    public decimal BalanceAmount { get; private set; }

    public string Status { get; set; } = "Confirmed";
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public Supplier Supplier { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public ICollection<PurchaseDetail> PurchaseDetails { get; set; } = new List<PurchaseDetail>();
}
