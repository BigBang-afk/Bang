namespace ZarghoonJewellers.App.Models
{
    /// <summary>Aggregated gold and cash position of a Karigar, used by the Karigar Ledger and Reports screens.</summary>
    public class KarigarSummary
    {
        public int KarigarId { get; set; }
        public string KarigarName { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;

        public decimal GoldPayable { get; set; }
        public decimal GoldReceivable { get; set; }
        public decimal NetGoldBalance => GoldReceivable - GoldPayable;

        public decimal CashPayable { get; set; }
        public decimal CashReceivable { get; set; }
        public decimal NetCashBalance => CashReceivable - CashPayable;
    }
}
