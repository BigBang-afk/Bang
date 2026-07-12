using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using TradingPortfolioDashboard.Services;

namespace TradingPortfolioDashboard.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly PortfolioService _portfolioService;

    [ObservableProperty] private object? _currentView;
    [ObservableProperty] private string _activeTab = "Dashboard";

    public DashboardViewModel DashboardViewModel { get; }
    public TradesViewModel TradesViewModel { get; }

    public MainViewModel(PortfolioService portfolioService)
    {
        _portfolioService = portfolioService;
        DashboardViewModel = new DashboardViewModel(portfolioService);
        TradesViewModel = new TradesViewModel(portfolioService);

        _portfolioService.DataChanged += () => DashboardViewModel.Refresh();

        ShowDashboard();
    }

    [RelayCommand]
    private void ShowDashboard()
    {
        DashboardViewModel.Refresh();
        CurrentView = DashboardViewModel;
        ActiveTab = "Dashboard";
    }

    [RelayCommand]
    private void ShowTrades()
    {
        CurrentView = TradesViewModel;
        ActiveTab = "Trades";
    }
}
