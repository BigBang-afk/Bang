namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A single cash/bank movement (receipt or payment). <see cref="ReferenceType"/>/<see cref="ReferenceId"/>
/// loosely link back to the originating Invoice, Purchase, Expense or Income row without a hard FK,
/// so the ledger can also record free-standing manual entries. <see cref="EntityType"/>/<see cref="EntityId"/>
/// (Customer/Supplier/Karigar), when set, is what the Customer/Supplier/Karigar Ledger screens filter
/// on to show every cash movement for that party in one place.</summary>
public class CashLedgerEntry
{
    public int CashLedgerId { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.Now;
    public string TransactionType { get; set; } = string.Empty; // Receipt / Payment
    public string ReferenceType { get; set; } = string.Empty;   // Invoice / Purchase / Expense / Income / Manual
    public int? ReferenceId { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMode { get; set; } = "Cash";
    public int? BankAccountId { get; set; }
    public string? Description { get; set; }
    public decimal RunningBalance { get; set; }
    public string? EntityType { get; set; } // Customer / Supplier / Karigar
    public int? EntityId { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public BankAccount? BankAccount { get; set; }
    public User CreatedByUser { get; set; } = null!;
}
