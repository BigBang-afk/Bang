namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A shop operating expense (rent, utilities, salaries, etc.).</summary>
public class Expense
{
    public int ExpenseId { get; set; }
    public DateOnly ExpenseDate { get; set; }
    public string ExpenseCategory { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMode { get; set; } = "Cash";
    public int? BankAccountId { get; set; }
    public int? ApprovedBy { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public BankAccount? BankAccount { get; set; }
    public User? ApprovedByUser { get; set; }
    public User CreatedByUser { get; set; } = null!;
}
