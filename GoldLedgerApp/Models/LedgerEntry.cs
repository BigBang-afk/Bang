using SQLite;

namespace GoldLedgerApp.Models;

public enum LedgerEntryType
{
	/// <summary>Increases the amount the customer owes the shop.</summary>
	Debit = 0,

	/// <summary>Decreases the amount the customer owes the shop (payment received, credit note).</summary>
	Credit = 1
}

public enum LedgerReferenceType
{
	OpeningBalance = 0,
	GoldTransaction = 1,
	Payment = 2,
	Adjustment = 3
}

public class LedgerEntry
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	[Indexed]
	public int CustomerId { get; set; }

	public DateTime Date { get; set; } = DateTime.Now;

	public LedgerEntryType Type { get; set; }

	public decimal Amount { get; set; }

	public LedgerReferenceType ReferenceType { get; set; }

	public int? ReferenceId { get; set; }

	public string Notes { get; set; } = string.Empty;

	/// <summary>Customer's running balance immediately after this entry. Denormalized for fast display.</summary>
	public decimal RunningBalance { get; set; }
}
