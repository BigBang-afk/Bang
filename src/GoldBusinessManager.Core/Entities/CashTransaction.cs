using SQLite;
using GoldBusinessManager.Core.Enums;

namespace GoldBusinessManager.Core.Entities;

[Table("CashTransactions")]
public class CashTransaction
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    public DateTime TransactionDate { get; set; } = DateTime.Now;

    public CashTransactionType Type { get; set; }

    /// <summary>Signed: positive increases cash in hand, negative decreases it.</summary>
    public double Amount { get; set; }

    /// <summary>Cash balance immediately after this transaction.</summary>
    public double RunningBalance { get; set; }

    [MaxLength(250)]
    public string? Description { get; set; }

    /// <summary>"SalesInvoice", "Purchase", "Expense", or "Manual".</summary>
    [MaxLength(30)]
    public string ReferenceType { get; set; } = "Manual";

    public int? ReferenceId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
