using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace ZarghoonJewellers.App.Views
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            Loaded += (_, _) => ShowDashboard();
        }

        private void Nav_Click(object sender, RoutedEventArgs e)
        {
            if (sender is not Button button) return;
            SetActiveButton(button);

            if (button == BtnDashboard) MainContent.Content = new DashboardView();
            else if (button == BtnCashIn) MainContent.Content = new CashTransactionView(Models.TransactionType.In);
            else if (button == BtnCashOut) MainContent.Content = new CashTransactionView(Models.TransactionType.Out);
            else if (button == BtnGoldIn) MainContent.Content = new GoldTransactionView(Models.TransactionType.In);
            else if (button == BtnGoldOut) MainContent.Content = new GoldTransactionView(Models.TransactionType.Out);
            else if (button == BtnKarigarLedger) MainContent.Content = new KarigarLedgerView();
            else if (button == BtnKarigarManagement) MainContent.Content = new KarigarManagementView();
            else if (button == BtnReports) MainContent.Content = new ReportsView();
            else if (button == BtnSettings) MainContent.Content = new SettingsView();
        }

        private void ShowDashboard()
        {
            SetActiveButton(BtnDashboard);
            MainContent.Content = new DashboardView();
        }

        private void SetActiveButton(Button active)
        {
            var goldBrush = (Brush)FindResource("GoldBrush");
            var sidebarText = (Brush)FindResource("SidebarTextBrush");

            foreach (var button in new[]
                     {
                         BtnDashboard, BtnCashIn, BtnCashOut, BtnGoldIn, BtnGoldOut,
                         BtnKarigarLedger, BtnKarigarManagement, BtnReports, BtnSettings
                     })
            {
                bool isActive = button == active;
                button.Background = isActive ? goldBrush : Brushes.Transparent;
                button.Foreground = isActive ? Brushes.Black : sidebarText;
                button.FontWeight = isActive ? FontWeights.Bold : FontWeights.Normal;
            }
        }
    }
}
