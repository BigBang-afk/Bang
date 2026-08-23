using System;
using System.Collections.Generic;
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
    public partial class KarigarLedgerView : UserControl
    {
        private readonly KarigarRepository _karigarRepo = new();
        private readonly LedgerRepository _ledgerRepo = new();
        private readonly SettingsRepository _settingsRepo = new();
        private readonly ReportPrintService _printService = new();
        private readonly ObservableCollection<LedgerEntry> _entries = new();

        public KarigarLedgerView()
        {
            InitializeComponent();
            LedgerGrid.ItemsSource = _entries;
            Loaded += (_, _) => LoadKarigars();
        }

        private void LoadKarigars()
        {
            CmbKarigar.ItemsSource = _karigarRepo.GetAll();
        }

        private void CmbKarigar_SelectionChanged(object sender, SelectionChangedEventArgs e) => RefreshLedger();

        private void Filter_FilterChanged(DateTime? from, DateTime? to) => RefreshLedger();

        private void RefreshLedger()
        {
            var karigar = CmbKarigar.SelectedItem as Karigar;
            if (karigar == null)
            {
                TxtNoSelection.Visibility = Visibility.Visible;
                PnlContent.Visibility = Visibility.Collapsed;
                BrdGrid.Visibility = Visibility.Collapsed;
                _entries.Clear();
                return;
            }

            TxtNoSelection.Visibility = Visibility.Collapsed;
            PnlContent.Visibility = Visibility.Visible;
            BrdGrid.Visibility = Visibility.Visible;

            var summary = _ledgerRepo.GetKarigarSummary(karigar, Filter.From, Filter.To);
            TxtGoldPayable.Text = Formatting.Gold(summary.GoldPayable);
            TxtGoldReceivable.Text = Formatting.Gold(summary.GoldReceivable);
            TxtCashPayable.Text = Formatting.Cash(summary.CashPayable);
            TxtCashReceivable.Text = Formatting.Cash(summary.CashReceivable);

            var entries = _ledgerRepo.GetKarigarLedger(karigar.Id, Filter.From, Filter.To);
            _entries.Clear();
            foreach (var entry in entries) _entries.Add(entry);
        }

        private void BtnPrint_Click(object sender, RoutedEventArgs e)
        {
            var karigar = CmbKarigar.SelectedItem as Karigar;
            if (karigar == null)
            {
                MessageBox.Show("Please select a Karigar first.", "Zarghoon Jewellers", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var settings = _settingsRepo.Get();
            var summary = _ledgerRepo.GetKarigarSummary(karigar, Filter.From, Filter.To);
            var entries = _ledgerRepo.GetKarigarLedger(karigar.Id, Filter.From, Filter.To);

            var document = _printService.BuildKarigarLedgerDocument(settings, karigar, Filter.From, Filter.To, summary, entries);
            _printService.PrintDocument(document, $"{karigar.Name} - Ledger Report");
        }
    }
}
