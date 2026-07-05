using SQLite;
using GoldBusinessManager.Core.Enums;

namespace GoldBusinessManager.Core.Entities;

[Table("Expenses")]
public class Expense
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    public DateTime ExpenseDate { get; set; } = DateTime.Now;

    public ExpenseCategory Category { get; set; }

    /// <summary>Only used when Category == Other.</summary>
    [MaxLength(100)]
    public string? CategoryCustomName { get; set; }

    public double Amount { get; set; }

    public PaymentMethod PaymentMethod { get; set; }

    /// <summary>Which bank account paid this expense, when PaymentMethod is Bank or Mixed.</summary>
    public int? BankAccountId { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
