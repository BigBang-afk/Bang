using System.ComponentModel.DataAnnotations.Schema;

namespace TradingJournal.Core.Models;

/// <summary>
/// A single profit or loss entry. Rates are snapshotted at entry time so that
/// past entries keep their historical PKR/gold value even if settings change later.
/// </summary>
public class LedgerEntry
{
    public int Id { get; set; }

    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public EntryType Type { get; set; }

    public decimal AmountUsd { get; set; }
    public decimal UsdToPkrRateApplied { get; set; }
    public decimal GoldRateApplied { get; set; }
    public string GoldUnitLabel { get; set; } = "Tola";

    public decimal AmountPkr { get; set; }
    public decimal AmountGold { get; set; }

    public DateTime Date { get; set; } = DateTime.Now;
    public string? Notes { get; set; }

    /// <summary>Signed PKR value: positive for profit, negative for loss. Used for running balances.</summary>
    [NotMapped]
    public decimal SignedAmountPkr => Type == EntryType.Profit ? AmountPkr : -AmountPkr;

    [NotMapped]
    public decimal SignedAmountUsd => Type == EntryType.Profit ? AmountUsd : -AmountUsd;

    [NotMapped]
    public decimal SignedAmountGold => Type == EntryType.Profit ? AmountGold : -AmountGold;
}
