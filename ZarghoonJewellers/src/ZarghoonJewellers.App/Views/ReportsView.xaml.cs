using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using ZarghoonJewellers.App.Helpers;
using ZarghoonJewellers.App.Models;
using ZarghoonJewellers.App.Repositories;
using ZarghoonJewellers.App.Services;

namespace ZarghoonJewellers.App.Views
{
    public partial class ReportsView : UserControl
    {
        private readonly LedgerRepository _ledgerRepo = new();
        private readonly SettingsRepository _settingsRepo = new();
        private readonly ReportPrintService _printService = new();
        private readonly ObservableCollection<KarigarSummary> _items = new();

        public ReportsView()
        {
            InitializeComponent();
            SummaryGrid.ItemsSource = _items;
            Loaded += (_, _) => LoadData();
        }

        private void Filter_FilterChanged(DateTime? from, DateTime? to) => LoadData();

        private void TxtSearch_TextChanged(object sender, TextChangedEventArgs e) => LoadData();

        private void LoadData()
        {
            var summaries = _ledgerRepo.GetAllKarigarSummaries(Filter.From, Filter.To, TxtSearch.Text);

            _items.Clear();
            foreach (var s in summaries) _items.Add(s);

            TxtTotalGoldPayable.Text = Formatting.Gold(summaries.Sum(s => s.GoldPayable));
            TxtTotalGoldReceivable.Text = Formatting.Gold(summaries.Sum(s => s.GoldReceivable));
            TxtTotalNetGold.Text = Formatting.Gold(summaries.Sum(s => s.NetGoldBalance));
            TxtTotalCashPayable.Text = Formatting.Cash(summaries.Sum(s => s.CashPayable));
            TxtTotalCashReceivable.Text = Formatting.Cash(summaries.Sum(s => s.CashReceivable));
            TxtTotalNetCash.Text = Formatting.Cash(summaries.Sum(s => s.NetCashBalance));
        }

        private void BtnPrint_Click(object sender, RoutedEventArgs e)
        {
            var settings = _settingsRepo.Get();
            var summaries = _ledgerRepo.GetAllKarigarSummaries(Filter.From, Filter.To, TxtSearch.Text);

            var document = _printService.BuildKarigarsReportDocument(settings, Filter.From, Filter.To, summaries);
            _printService.PrintDocument(document, "Karigar Reports - All Karigars");
        }
    }
}
