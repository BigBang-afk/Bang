using System;

namespace ZarghoonJewellers.App.Models
{
    public class CashTransaction
    {
        public int Id { get; set; }
        public DateTime Date { get; set; } = DateTime.Today;
        public TransactionType Type { get; set; }

        /// <summary>Linked Karigar, if the person picked matches a registered Karigar. Null for general shop cash.</summary>
        public int? KarigarId { get; set; }

        /// <summary>Free-text display name of the person (kept in sync with the Karigar name when linked).</summary>
        public string PersonName { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
