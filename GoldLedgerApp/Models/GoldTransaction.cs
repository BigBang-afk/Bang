using SQLite;

namespace GoldLedgerApp.Models;

public enum TransactionType
{
	Buy = 0,
	Sell = 1
}

public enum PaymentMode
{
	Cash = 0,
	Bank = 1,
	Credit = 2
}

public class GoldTransaction
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	public TransactionType Type { get; set; }

	public int? CustomerId { get; set; }

	[Ignore]
	public string CustomerName { get; set; } = "Walk-in";

	public DateTime Date { get; set; } = DateTime.Now;

	/// <summary>Weight as received/handed over, in grams.</summary>
	public double GrossWeightGrams { get; set; }

	/// <summary>Purity in karats, e.g. 24, 22, 18.</summary>
	public double PurityKarat { get; set; } = 24;

	/// <summary>Pure-gold equivalent weight in grams (GrossWeight * Purity/24).</summary>
	public double NetWeightGrams { get; set; }

	/// <summary>Rate per gram of 24K pure gold used for this transaction.</summary>
	public decimal RatePerGram { get; set; }

	/// <summary>NetWeightGrams * RatePerGram, before making charges.</summary>
	public decimal GoldValue { get; set; }

	/// <summary>Additional making/wastage charges, if any.</summary>
	public decimal MakingCharges { get; set; }

	/// <summary>Total transaction amount = GoldValue + MakingCharges.</summary>
	public decimal TotalAmount { get; set; }

	public decimal AmountPaid { get; set; }

	/// <summary>TotalAmount - AmountPaid. Positive means still owed on this transaction.</summary>
	public decimal BalanceDue { get; set; }

	public PaymentMode PaymentMode { get; set; } = PaymentMode.Cash;

	public string Notes { get; set; } = string.Empty;
}
