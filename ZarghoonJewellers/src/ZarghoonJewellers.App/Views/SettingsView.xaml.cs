using System.Windows;
using System.Windows.Controls;
using ZarghoonJewellers.App.Data;
using ZarghoonJewellers.App.Models;
using ZarghoonJewellers.App.Repositories;

namespace ZarghoonJewellers.App.Views
{
    public partial class SettingsView : UserControl
    {
        private readonly SettingsRepository _repo = new();

        public SettingsView()
        {
            InitializeComponent();
            Loaded += (_, _) => LoadSettings();
        }

        private void LoadSettings()
        {
            var settings = _repo.Get();
            TxtShopName.Text = settings.ShopName;
            TxtShopAddress.Text = settings.ShopAddress;
            TxtPhoneNumber.Text = settings.PhoneNumber;
            TxtReportHeader.Text = settings.ReportHeader;
            TxtReportFooter.Text = settings.ReportFooter;

            TxtDbPath.Text = "Local database file: " + DatabasePaths.DatabaseFile;
        }

        private void BtnSave_Click(object sender, RoutedEventArgs e)
        {
            var settings = new AppSettings
            {
                ShopName = string.IsNullOrWhiteSpace(TxtShopName.Text) ? "ZARGHOON JEWELLERS" : TxtShopName.Text.Trim(),
                ShopAddress = TxtShopAddress.Text?.Trim() ?? string.Empty,
                PhoneNumber = TxtPhoneNumber.Text?.Trim() ?? string.Empty,
                ReportHeader = TxtReportHeader.Text?.Trim() ?? string.Empty,
                ReportFooter = TxtReportFooter.Text?.Trim() ?? string.Empty,
            };

            _repo.Save(settings);
            MessageBox.Show("Settings saved successfully.", "Zarghoon Jewellers", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void BtnReset_Click(object sender, RoutedEventArgs e)
        {
            var defaults = new AppSettings();
            TxtShopName.Text = defaults.ShopName;
            TxtShopAddress.Text = defaults.ShopAddress;
            TxtPhoneNumber.Text = defaults.PhoneNumber;
            TxtReportHeader.Text = defaults.ReportHeader;
            TxtReportFooter.Text = defaults.ReportFooter;
        }
    }
}
