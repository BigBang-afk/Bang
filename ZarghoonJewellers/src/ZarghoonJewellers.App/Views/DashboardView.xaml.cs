using System;
using System.Windows.Controls;
using ZarghoonJewellers.App.Helpers;
using ZarghoonJewellers.App.Repositories;

namespace ZarghoonJewellers.App.Views
{
    public partial class DashboardView : UserControl
    {
        private readonly LedgerRepository _ledgerRepo = new();
        private readonly SettingsRepository _settingsRepo = new();

        public DashboardView()
        {
            InitializeComponent();
            Loaded += (_, _) => LoadData();
        }

        private void Filter_FilterChanged(DateTime? from, DateTime? to) => LoadData();

        private void LoadData()
        {
            TxtShopTitle.Text = _settingsRepo.Get().ShopName?.ToUpperInvariant() ?? "ZARGHOON JEWELLERS";

            var summary = _ledgerRepo.GetDashboardSummary(Filter.From, Filter.To);

            TxtCashIn.Text = Formatting.Cash(summary.TotalCashIn);
            TxtCashOut.Text = Formatting.Cash(summary.TotalCashOut);
            TxtCashBalance.Text = Formatting.Cash(summary.CashBalance);

            TxtGoldIn.Text = Formatting.Gold(summary.TotalGoldIn);
            TxtGoldOut.Text = Formatting.Gold(summary.TotalGoldOut);
            TxtGoldBalance.Text = Formatting.Gold(summary.GoldBalance);

            TxtTotalKarigars.Text = summary.TotalKarigars.ToString();
            TxtGoldPayable.Text = Formatting.Gold(summary.TotalGoldPayable);
            TxtGoldReceivable.Text = Formatting.Gold(summary.TotalGoldReceivable);
            TxtCashPayable.Text = Formatting.Cash(summary.TotalCashPayable);
            TxtCashReceivable.Text = Formatting.Cash(summary.TotalCashReceivable);
        }
    }
}
