using System;

namespace GeneralStorePro.Models;

public sealed class Expense
{
    public int Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
}
