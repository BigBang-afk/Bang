using SQLite;

namespace GoldLedgerApp.Models;

public class Customer
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	public string Name { get; set; } = string.Empty;

	public string Phone { get; set; } = string.Empty;

	public string Address { get; set; } = string.Empty;

	/// <summary>Positive = customer owes the shop. Negative = shop owes the customer.</summary>
	public decimal OpeningBalance { get; set; }

	public DateTime CreatedAt { get; set; } = DateTime.Now;

	[Ignore]
	public decimal CurrentBalance { get; set; }
}
