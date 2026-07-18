namespace ZarghoonJewellers.Domain.Entities;

/// <summary>Miscellaneous shop income outside of standard sales invoices (e.g. old-gold scrap sale, rental income).</summary>
public class Income
{
    public int IncomeId { get; set; }
    public DateOnly IncomeDate { get; set; }
    public string IncomeCategory { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMode { get; set; } = "Cash";
    public int? BankAccountId { get; set; }
    public int? ReceivedBy { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public BankAccount? BankAccount { get; set; }
    public User? ReceivedByUser { get; set; }
    public User CreatedByUser { get; set; } = null!;
}
