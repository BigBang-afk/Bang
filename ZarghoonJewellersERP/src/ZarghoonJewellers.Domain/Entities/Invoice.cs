namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A sales invoice (point-of-sale transaction) issued to a customer. Also used to
/// represent Returns and Exchanges (<see cref="InvoiceType"/>) so they share the exact same
/// line-item structure and posting logic as a normal sale instead of a parallel table.</summary>
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
    public decimal DiscountPercentage { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxPercentage { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }

    /// <summary>Database-computed persisted column (TotalAmount - PaidAmount). Do not set directly.</summary>
    public decimal BalanceAmount { get; private set; }

    public string PaymentMode { get; set; } = "Cash";
    public decimal OldGoldExchangeWeight { get; set; }
    public string Status { get; set; } = "Confirmed"; // Draft/Held/Confirmed/Cancelled/Returned

    /// <summary>Sale / Return / Exchange. Return and Exchange invoices carry negative-signed totals
    /// representing the refund/adjustment and reference <see cref="OriginalInvoiceId"/>.</summary>
    public string InvoiceType { get; set; } = "Sale";
    public int? OriginalInvoiceId { get; set; }

    /// <summary>Free-text label shown on the Hold/Recall screen (e.g. "Counter 2 - Mrs. Ali"), only
    /// meaningful while <see cref="Status"/> is "Held".</summary>
    public string? HoldLabel { get; set; }

    public int? ShiftId { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public Customer Customer { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public Shift? Shift { get; set; }
    public Invoice? OriginalInvoice { get; set; }
    public ICollection<InvoiceDetail> InvoiceDetails { get; set; } = new List<InvoiceDetail>();
    public ICollection<InvoicePayment> Payments { get; set; } = new List<InvoicePayment>();
}
