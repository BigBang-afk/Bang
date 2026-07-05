using SQLite;
using GoldBusinessManager.Core.Enums;

namespace GoldBusinessManager.Core.Entities;

[Table("BankTransactions")]
public class BankTransaction
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    [Indexed]
    public int BankAccountId { get; set; }

    public DateTime TransactionDate { get; set; } = DateTime.Now;

    public BankTransactionType Type { get; set; }

    /// <summary>Signed: positive increases the account balance, negative decreases it.</summary>
    public double Amount { get; set; }

    /// <summary>Account balance immediately after this transaction.</summary>
    public double RunningBalance { get; set; }

    [MaxLength(250)]
    public string? Description { get; set; }

    /// <summary>"SalesInvoice", "Purchase", or "Manual". For transfers this is "Transfer".</summary>
    [MaxLength(30)]
    public string ReferenceType { get; set; } = "Manual";

    public int? ReferenceId { get; set; }

    /// <summary>Set on both legs of a transfer between accounts, pointing at the other account.</summary>
    public int? RelatedBankAccountId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
