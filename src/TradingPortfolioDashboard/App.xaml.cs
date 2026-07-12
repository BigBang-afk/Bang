using System.Windows;
using TradingPortfolioDashboard.Data;
using TradingPortfolioDashboard.Services;
using TradingPortfolioDashboard.ViewModels;
using TradingPortfolioDashboard.Views;

namespace TradingPortfolioDashboard;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var store = new PortfolioStore();
        var portfolioService = new PortfolioService(store);
        var mainViewModel = new MainViewModel(portfolioService);

        var mainWindow = new MainWindow
        {
            DataContext = mainViewModel
        };

        MainWindow = mainWindow;
        mainWindow.Show();
    }
}
