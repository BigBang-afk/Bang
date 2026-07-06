using System.Windows.Input;
using TradingJournal.App.Common;
using TradingJournal.Core.Services;

namespace TradingJournal.App.ViewModels;

public class MainViewModel : ViewModelBase
{
    public MainViewModel(
        ILedgerService ledgerService,
        ICustomerService customerService,
        ISettingsService settingsService,
        EntryDialogService entryDialogService)
    {
        DashboardViewModel = new DashboardViewModel(ledgerService, entryDialogService);
        AddProfitViewModel = new AddProfitViewModel(ledgerService, customerService, settingsService, OnEntrySaved);
        AddLossViewModel = new AddLossViewModel(ledgerService, customerService, settingsService, OnEntrySaved);
        CustomerLedgerViewModel = new CustomerLedgerViewModel(ledgerService, customerService, entryDialogService);
        SettingsViewModel = new SettingsViewModel(settingsService, OnSettingsSaved);

        _currentViewModel = DashboardViewModel;

        ShowDashboardCommand = new RelayCommand(() =>
        {
            _ = DashboardViewModel.RefreshAsync();
            CurrentViewModel = DashboardViewModel;
        });

        ShowAddProfitCommand = new RelayCommand(() => CurrentViewModel = AddProfitViewModel);
        ShowAddLossCommand = new RelayCommand(() => CurrentViewModel = AddLossViewModel);

        ShowCustomerLedgerCommand = new RelayCommand(() =>
        {
            CustomerLedgerViewModel.RefreshCommand.Execute(null);
            CurrentViewModel = CustomerLedgerViewModel;
        });

        ShowSettingsCommand = new RelayCommand(() => CurrentViewModel = SettingsViewModel);
    }

    public DashboardViewModel DashboardViewModel { get; }
    public AddProfitViewModel AddProfitViewModel { get; }
    public AddLossViewModel AddLossViewModel { get; }
    public CustomerLedgerViewModel CustomerLedgerViewModel { get; }
    public SettingsViewModel SettingsViewModel { get; }

    private ViewModelBase _currentViewModel;
    public ViewModelBase CurrentViewModel
    {
        get => _currentViewModel;
        set => SetProperty(ref _currentViewModel, value);
    }

    public ICommand ShowDashboardCommand { get; }
    public ICommand ShowAddProfitCommand { get; }
    public ICommand ShowAddLossCommand { get; }
    public ICommand ShowCustomerLedgerCommand { get; }
    public ICommand ShowSettingsCommand { get; }

    private void OnEntrySaved()
    {
        _ = DashboardViewModel.RefreshAsync();
        CurrentViewModel = DashboardViewModel;
    }

    private void OnSettingsSaved()
    {
        _ = DashboardViewModel.RefreshAsync();
    }
}
