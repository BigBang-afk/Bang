namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A retail/wholesale customer. Balances are running totals maintained by the
/// invoicing and ledger services rather than recomputed on every read.</summary>
public class Customer
{
    public int CustomerId { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? CNIC { get; set; }
    public string CustomerType { get; set; } = "Retail";
    public decimal OpeningBalance { get; set; }

    /// <summary>Positive = customer owes the shop money (receivable).</summary>
    public decimal CurrentBalance { get; set; }

    /// <summary>Positive = the shop owes the customer gold (e.g. old-gold exchange credit).</summary>
    public decimal CurrentGoldBalance { get; set; }
    public decimal CreditLimit { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<RepairOrder> RepairOrders { get; set; } = new List<RepairOrder>();
}
