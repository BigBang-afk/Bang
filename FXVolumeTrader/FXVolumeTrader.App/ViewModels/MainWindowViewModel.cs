using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.Input;
using FXVolumeTrader.Core.Interfaces;

namespace FXVolumeTrader.App.ViewModels;

/// <summary>
/// Owns the sidebar menu and hosts the currently navigated page view model.
/// The window shell itself contains no business logic - selecting a menu
/// item simply asks INavigationService to activate the matching view model.
/// </summary>
public sealed partial class MainWindowViewModel : ViewModelBase
{
    private readonly INavigationService _navigationService;

    public ObservableCollection<NavItem> MenuItems { get; }

    public object? CurrentViewModel => _navigationService.CurrentViewModel;

    public MainWindowViewModel(INavigationService navigationService)
    {
        _navigationService = navigationService;
        _navigationService.CurrentViewModelChanged += (_, _) => OnPropertyChanged(nameof(CurrentViewModel));

        MenuItems = new ObservableCollection<NavItem>
        {
            new() { Title = "Dashboard", IconGlyph = "▦", ViewModelType = typeof(DashboardViewModel) },
            new() { Title = "Live Chart", IconGlyph = "⤳", ViewModelType = typeof(LiveChartViewModel) },
            new() { Title = "Signal History", IconGlyph = "≡", ViewModelType = typeof(SignalHistoryViewModel) },
            new() { Title = "Paper Trading", IconGlyph = "✎", ViewModelType = typeof(PaperTradingViewModel) },
            new() { Title = "Quotex Assistant", IconGlyph = "✓", ViewModelType = typeof(QuotexAssistantViewModel) },
            new() { Title = "Backtesting", IconGlyph = "↻", ViewModelType = typeof(BacktestingViewModel) },
            new() { Title = "Trading Journal", IconGlyph = "☷", ViewModelType = typeof(TradingJournalViewModel) },
            new() { Title = "Performance Analytics", IconGlyph = "✦", ViewModelType = typeof(PerformanceAnalyticsViewModel) },
            new() { Title = "Strategy Settings", IconGlyph = "⚙", ViewModelType = typeof(StrategySettingsViewModel) },
            new() { Title = "Risk Settings", IconGlyph = "⚠", ViewModelType = typeof(RiskSettingsViewModel) },
            new() { Title = "Data Provider Settings", IconGlyph = "⇄", ViewModelType = typeof(DataProviderSettingsViewModel) },
            new() { Title = "Application Logs", IconGlyph = "☰", ViewModelType = typeof(ApplicationLogsViewModel) },
            new() { Title = "Backup & Restore", IconGlyph = "☁", ViewModelType = typeof(BackupRestoreViewModel) },
            new() { Title = "About & Risk Warning", IconGlyph = "ℹ", ViewModelType = typeof(AboutViewModel) },
        };

        _navigationService.NavigateTo<DashboardViewModel>();
    }

    [RelayCommand]
    private void NavigateTo(NavItem? item)
    {
        if (item is not null)
        {
            _navigationService.NavigateTo(item.ViewModelType);
        }
    }
}
