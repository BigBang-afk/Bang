namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A sales invoice (point-of-sale transaction) issued to a customer.</summary>
public class Invoice
{
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; } = DateTime.Now;
    public int CustomerId { get; set; }
    public decimal GoldRateAtSale { get; set; }
    public decimal TotalGrossWeight { get; set; }
    public decimal TotalNetWeight { get; set; }
    public decimal SubTotal { get; set; }
    public decimal MakingChargeTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }

    /// <summary>Database-computed persisted column (TotalAmount - PaidAmount). Do not set directly.</summary>
    public decimal BalanceAmount { get; private set; }

    public string PaymentMode { get; set; } = "Cash";
    public decimal OldGoldExchangeWeight { get; set; }
    public string Status { get; set; } = "Confirmed";
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public Customer Customer { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public ICollection<InvoiceDetail> InvoiceDetails { get; set; } = new List<InvoiceDetail>();
}
