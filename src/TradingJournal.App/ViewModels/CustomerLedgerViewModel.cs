using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Input;
using TradingJournal.App.Common;
using TradingJournal.App.Reports;
using TradingJournal.App.Views;
using TradingJournal.Core.Models;
using TradingJournal.Core.Services;

namespace TradingJournal.App.ViewModels;

public class CustomerLedgerViewModel : ViewModelBase
{
    private readonly ILedgerService _ledgerService;
    private readonly ICustomerService _customerService;
    private readonly EntryDialogService _entryDialogService;

    public CustomerLedgerViewModel(ILedgerService ledgerService, ICustomerService customerService, EntryDialogService entryDialogService)
    {
        _ledgerService = ledgerService;
        _customerService = customerService;
        _entryDialogService = entryDialogService;

        AddCustomerCommand = new RelayCommand(async () => await AddCustomerAsync());
        RefreshCommand = new RelayCommand(async () => await LoadCustomersAsync());
        AddProfitCommand = new RelayCommand(async () => await AddEntryAsync(EntryType.Profit), () => SelectedCustomer is not null);
        AddLossCommand = new RelayCommand(async () => await AddEntryAsync(EntryType.Loss), () => SelectedCustomer is not null);
        EditEntryCommand = new RelayCommand(async param => await EditEntryAsync((param as LedgerEntryRow)?.Entry));
        DeleteEntryCommand = new RelayCommand(async param => await DeleteEntryAsync((param as LedgerEntryRow)?.Entry));
        PreviewReportCommand = new RelayCommand(PreviewReport, () => SelectedCustomer is not null);

        _ = LoadCustomersAsync();
    }

    public ObservableCollection<Customer> Customers { get; } = new();
    public ObservableCollection<LedgerEntryRow> Entries { get; } = new();

    private Customer? _selectedCustomer;
    public Customer? SelectedCustomer
    {
        get => _selectedCustomer;
        set
        {
            if (SetProperty(ref _selectedCustomer, value))
                _ = LoadEntriesAsync();
        }
    }

    private string _newCustomerName = string.Empty;
    public string NewCustomerName
    {
        get => _newCustomerName;
        set => SetProperty(ref _newCustomerName, value);
    }

    private string? _newCustomerPhone;
    public string? NewCustomerPhone
    {
        get => _newCustomerPhone;
        set => SetProperty(ref _newCustomerPhone, value);
    }

    private decimal _totalProfitPkr;
    public decimal TotalProfitPkr
    {
        get => _totalProfitPkr;
        set => SetProperty(ref _totalProfitPkr, value);
    }

    private decimal _totalLossPkr;
    public decimal TotalLossPkr
    {
        get => _totalLossPkr;
        set => SetProperty(ref _totalLossPkr, value);
    }

    private decimal _netPkr;
    public decimal NetPkr
    {
        get => _netPkr;
        set => SetProperty(ref _netPkr, value);
    }

    private decimal _netGold;
    public decimal NetGold
    {
        get => _netGold;
        set => SetProperty(ref _netGold, value);
    }

    private string? _errorMessage;
    public string? ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public ICommand AddCustomerCommand { get; }
    public ICommand RefreshCommand { get; }
    public ICommand AddProfitCommand { get; }
    public ICommand AddLossCommand { get; }
    public ICommand EditEntryCommand { get; }
    public ICommand DeleteEntryCommand { get; }
    public ICommand PreviewReportCommand { get; }

    private async Task LoadCustomersAsync()
    {
        var previouslySelectedId = SelectedCustomer?.Id;

        var customers = await _customerService.GetAllAsync();
        Customers.Clear();
        foreach (var customer in customers)
            Customers.Add(customer);

        SelectedCustomer = Customers.FirstOrDefault(c => c.Id == previouslySelectedId) ?? Customers.FirstOrDefault();
    }

    private async Task AddCustomerAsync()
    {
        ErrorMessage = null;

        if (string.IsNullOrWhiteSpace(NewCustomerName))
        {
            ErrorMessage = "Enter a customer name.";
            return;
        }

        try
        {
            var customer = await _customerService.AddAsync(NewCustomerName, NewCustomerPhone, null);
            NewCustomerName = string.Empty;
            NewCustomerPhone = null;

            await LoadCustomersAsync();
            SelectedCustomer = Customers.FirstOrDefault(c => c.Id == customer.Id);
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
    }

    private async Task AddEntryAsync(EntryType type)
    {
        if (SelectedCustomer is null)
            return;

        var saved = await _entryDialogService.ShowAddAsync(type, SelectedCustomer.Id);
        if (saved)
            await LoadEntriesAsync();
    }

    private async Task EditEntryAsync(LedgerEntry? entry)
    {
        if (entry is null)
            return;

        var saved = await _entryDialogService.ShowEditAsync(entry);
        if (saved)
            await LoadEntriesAsync();
    }

    private async Task DeleteEntryAsync(LedgerEntry? entry)
    {
        if (entry is null)
            return;

        var confirmed = MessageBox.Show(
            $"Delete this {entry.Type} entry of ${entry.AmountUsd:N2}?",
            "Confirm Delete",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning) == MessageBoxResult.Yes;

        if (!confirmed)
            return;

        await _ledgerService.DeleteEntryAsync(entry.Id);
        await LoadEntriesAsync();
    }

    private void PreviewReport()
    {
        if (SelectedCustomer is null)
            return;

        var goldUnitLabel = Entries.FirstOrDefault()?.Entry.GoldUnitLabel ?? "Tola";

        var document = CustomerStatementReportBuilder.Build(
            SelectedCustomer,
            Entries,
            TotalProfitPkr,
            TotalLossPkr,
            NetPkr,
            NetGold,
            goldUnitLabel);

        var window = new ReportPreviewWindow(document)
        {
            Owner = Application.Current.MainWindow
        };
        window.Show();
    }

    private async Task LoadEntriesAsync()
    {
        Entries.Clear();

        if (SelectedCustomer is null)
        {
            TotalProfitPkr = 0;
            TotalLossPkr = 0;
            NetPkr = 0;
            NetGold = 0;
            return;
        }

        var entries = await _ledgerService.GetEntriesForCustomerAsync(SelectedCustomer.Id);

        decimal running = 0;
        foreach (var entry in entries)
        {
            running += entry.SignedAmountPkr;
            Entries.Add(new LedgerEntryRow(entry, running));
        }

        TotalProfitPkr = entries.Where(e => e.Type == EntryType.Profit).Sum(e => e.AmountPkr);
        TotalLossPkr = entries.Where(e => e.Type == EntryType.Loss).Sum(e => e.AmountPkr);
        NetPkr = running;
        NetGold = entries.Sum(e => e.SignedAmountGold);
    }
}
