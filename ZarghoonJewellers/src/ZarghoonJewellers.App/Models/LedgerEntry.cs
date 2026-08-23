using System;

namespace ZarghoonJewellers.App.Models
{
    /// <summary>One row of a Karigar's combined cash + gold ledger, with running balances.</summary>
    public class LedgerEntry
    {
        public DateTime Date { get; set; }
        public string TransactionType { get; set; } = string.Empty; // "Cash In", "Cash Out", "Gold In", "Gold Out", "Opening Balance"
        public string Description { get; set; } = string.Empty;

        public decimal GoldIn { get; set; }
        public decimal GoldOut { get; set; }
        public decimal GoldBalance { get; set; }

        public decimal CashIn { get; set; }
        public decimal CashOut { get; set; }
        public decimal CashBalance { get; set; }

        public string Notes { get; set; } = string.Empty;
    }
}
