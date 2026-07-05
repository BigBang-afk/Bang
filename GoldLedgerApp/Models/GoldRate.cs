using SQLite;

namespace GoldLedgerApp.Models;

public class GoldRate
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	public DateTime Date { get; set; } = DateTime.Now;

	/// <summary>Rate per gram for 24K (999) pure gold.</summary>
	public decimal RatePerGram24K { get; set; }
}
