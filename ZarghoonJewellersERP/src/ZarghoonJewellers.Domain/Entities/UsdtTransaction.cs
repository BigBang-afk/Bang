namespace ZarghoonJewellers.Domain.Entities;

/// <summary>A USDT (Tether) buy/sell transaction - used by shops that hedge or settle gold
/// purchases in stablecoin alongside traditional cash/bank rails.</summary>
public class UsdtTransaction
{
    public int UsdtTransactionId { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.Now;
    public string TransactionType { get; set; } = string.Empty; // Buy / Sell
    public decimal AmountUsdt { get; set; }
    public decimal RateInPkr { get; set; }

    /// <summary>Database-computed persisted column (AmountUsdt * RateInPkr). Do not set directly.</summary>
    public decimal TotalPkr { get; private set; }

    public string? WalletAddress { get; set; }
    public string? ReferenceNote { get; set; }
    public int? BankAccountId { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public BankAccount? BankAccount { get; set; }
    public User CreatedByUser { get; set; } = null!;
}
