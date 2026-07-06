using System.Collections.ObjectModel;
using System.Windows.Input;
using TradingJournal.App.Common;
using TradingJournal.Core.Models;
using TradingJournal.Core.Services;

namespace TradingJournal.App.ViewModels;

/// <summary>
/// Backs the Add/Edit entry dialog. In add mode the preview uses today's settings rates
/// (and saving snapshots them). In edit mode the preview and save both keep the rates that
/// were already snapshotted on the entry, so correcting a typo doesn't re-price it.
/// </summary>
public class EntryDialogViewModel : ViewModelBase
{
    private readonly ILedgerService _ledgerService;
    private readonly ISettingsService _settingsService;
    private readonly LedgerEntry? _existingEntry;

    private decimal _previewUsdToPkrRate;
    private decimal _previewGoldRate;

    public EntryDialogViewModel(
        ILedgerService ledgerService,
        ISettingsService settingsService,
        IReadOnlyList<Customer> customers,
        LedgerEntry? existingEntry,
        EntryType defaultType,
        int? defaultCustomerId)
    {
        _ledgerService = ledgerService;
        _settingsService = settingsService;
        _existingEntry = existingEntry;

        Customers = new ObservableCollection<Customer>(customers);
        EntryTypes = new ObservableCollection<EntryType>(Enum.GetValues<EntryType>());

        Title = existingEntry is null ? "Add Entry" : "Edit Entry";

        SaveCommand = new RelayCommand(async () => await SaveAsync());

        _selectedEntryType = existingEntry?.Type ?? defaultType;
        _selectedCustomer = Customers.FirstOrDefault(c => c.Id == (existingEntry?.CustomerId ?? defaultCustomerId));
        _amountText = existingEntry is null ? string.Empty : existingEntry.AmountUsd.ToString("0.####");
        _date = existingEntry?.Date ?? DateTime.Now;
        _notes = existingEntry?.Notes;

        _ = LoadAsync();
    }

    public string Title { get; }
    public bool Saved { get; private set; }
    public event EventHandler? RequestClose;

    public ObservableCollection<Customer> Customers { get; }
    public ObservableCollection<EntryType> EntryTypes { get; }

    private EntryType _selectedEntryType;
    public EntryType SelectedEntryType
    {
        get => _selectedEntryType;
        set => SetProperty(ref _selectedEntryType, value);
    }

    private Customer? _selectedCustomer;
    public Customer? SelectedCustomer
    {
        get => _selectedCustomer;
        set => SetProperty(ref _selectedCustomer, value);
    }

    private string _amountText;
    public string AmountText
    {
        get => _amountText;
        set
        {
            if (SetProperty(ref _amountText, value))
                UpdatePreview();
        }
    }

    private DateTime _date;
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
        if (_existingEntry is not null)
        {
            _previewUsdToPkrRate = _existingEntry.UsdToPkrRateApplied;
            _previewGoldRate = _existingEntry.GoldRateApplied;
        }
        else
        {
            var settings = await _settingsService.GetSettingsAsync();
            _previewUsdToPkrRate = settings.UsdToPkrRate;
            _previewGoldRate = settings.GoldRatePerUnit;
        }

        UpdatePreview();
    }

    private void UpdatePreview()
    {
        if (decimal.TryParse(AmountText, out var amount) && amount > 0 && _previewUsdToPkrRate > 0 && _previewGoldRate > 0)
        {
            var (pkr, gold) = CalculationService.ConvertUsd(amount, _previewUsdToPkrRate, _previewGoldRate);
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
            if (_existingEntry is null)
                await _ledgerService.AddEntryAsync(SelectedEntryType, amount, SelectedCustomer?.Id, Date, Notes);
            else
                await _ledgerService.UpdateEntryAsync(_existingEntry.Id, SelectedEntryType, amount, SelectedCustomer?.Id, Date, Notes);

            Saved = true;
            RequestClose?.Invoke(this, EventArgs.Empty);
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
    }
}
