using System.Collections.ObjectModel;
using System.Windows.Input;
using TradingJournal.App.Common;
using TradingJournal.Core.Models;
using TradingJournal.Core.Services;

namespace TradingJournal.App.ViewModels;

public abstract class AddEntryViewModelBase : ViewModelBase
{
    private readonly ILedgerService _ledgerService;
    private readonly ICustomerService _customerService;
    private readonly ISettingsService _settingsService;
    private readonly Action _onSaved;

    private decimal _usdToPkrRate;
    private decimal _goldRate;

    protected abstract EntryType Type { get; }

    protected AddEntryViewModelBase(
        ILedgerService ledgerService,
        ICustomerService customerService,
        ISettingsService settingsService,
        Action onSaved)
    {
        _ledgerService = ledgerService;
        _customerService = customerService;
        _settingsService = settingsService;
        _onSaved = onSaved;

        SaveCommand = new RelayCommand(async () => await SaveAsync());
        _ = LoadAsync();
    }

    public ObservableCollection<Customer> Customers { get; } = new();

    private Customer? _selectedCustomer;
    public Customer? SelectedCustomer
    {
        get => _selectedCustomer;
        set => SetProperty(ref _selectedCustomer, value);
    }

    private string _amountText = string.Empty;
    public string AmountText
    {
        get => _amountText;
        set
        {
            if (SetProperty(ref _amountText, value))
                UpdatePreview();
        }
    }

    private DateTime _date = DateTime.Now;
    public DateTime Date
    {
        get => _date;
        set => SetProperty(ref _date, value);
    }

    private string? _notes;
    public string? Notes
    {
        get => _notes;
        set => SetProperty(ref _notes, value);
    }

    private string _previewText = string.Empty;
    public string PreviewText
    {
        get => _previewText;
        set => SetProperty(ref _previewText, value);
    }

    private string? _errorMessage;
    public string? ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public ICommand SaveCommand { get; }

    private async Task LoadAsync()
    {
        var customers = await _customerService.GetAllAsync();
        Customers.Clear();
        foreach (var customer in customers)
            Customers.Add(customer);

        var settings = await _settingsService.GetSettingsAsync();
        _usdToPkrRate = settings.UsdToPkrRate;
        _goldRate = settings.GoldRatePerUnit;
        UpdatePreview();
    }

    private void UpdatePreview()
    {
        if (decimal.TryParse(AmountText, out var amount) && amount > 0 && _usdToPkrRate > 0 && _goldRate > 0)
        {
            var (pkr, gold) = CalculationService.ConvertUsd(amount, _usdToPkrRate, _goldRate);
            PreviewText = $"= Rs {pkr:N2} PKR  ({gold:N4} gold units)";
        }
        else
        {
            PreviewText = string.Empty;
        }
    }

    private async Task SaveAsync()
    {
        ErrorMessage = null;

        if (!decimal.TryParse(AmountText, out var amount) || amount <= 0)
        {
            ErrorMessage = "Enter a valid USD amount greater than zero.";
            return;
        }

        try
        {
            await _ledgerService.AddEntryAsync(Type, amount, SelectedCustomer?.Id, Date, Notes);

            AmountText = string.Empty;
            Notes = null;
            PreviewText = string.Empty;

            _onSaved();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
    }
}
