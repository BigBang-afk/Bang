using System;

namespace ZarghoonJewellers.App.Models
{
    public class GoldTransaction
    {
        public int Id { get; set; }
        public DateTime Date { get; set; } = DateTime.Today;
        public TransactionType Type { get; set; }

        /// <summary>Linked Karigar, if the person picked matches a registered Karigar. Null for general shop gold.</summary>
        public int? KarigarId { get; set; }

        /// <summary>Free-text display name of the person (kept in sync with the Karigar name when linked).</summary>
        public string PersonName { get; set; } = string.Empty;

        /// <summary>Gold weight in grams.</summary>
        public decimal Weight { get; set; }

        /// <summary>Purity / karat, e.g. "24K", "22K", "21K", "18K".</summary>
        public string Purity { get; set; } = "22K";

        public string Description { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
