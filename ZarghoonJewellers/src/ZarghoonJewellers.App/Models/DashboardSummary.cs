namespace ZarghoonJewellers.App.Models
{
    /// <summary>Shop-wide totals shown as cards on the Dashboard.</summary>
    public class DashboardSummary
    {
        public decimal TotalCashIn { get; set; }
        public decimal TotalCashOut { get; set; }
        public decimal CashBalance => TotalCashIn - TotalCashOut;

        public decimal TotalGoldIn { get; set; }
        public decimal TotalGoldOut { get; set; }
        public decimal GoldBalance => TotalGoldIn - TotalGoldOut;

        public int TotalKarigars { get; set; }

        public decimal TotalGoldPayable { get; set; }
        public decimal TotalGoldReceivable { get; set; }

        public decimal TotalCashPayable { get; set; }
        public decimal TotalCashReceivable { get; set; }
    }
}
