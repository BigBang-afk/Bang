using System.Windows;
using TradingJournal.App.ViewModels;
using TradingJournal.App.Views;
using TradingJournal.Core.Models;
using TradingJournal.Core.Services;

namespace TradingJournal.App.Common;

/// <summary>
/// Opens the shared Add/Edit entry dialog. Returns true if the user saved changes.
/// </summary>
public class EntryDialogService
{
    private readonly ILedgerService _ledgerService;
    private readonly ISettingsService _settingsService;
    private readonly ICustomerService _customerService;

    public EntryDialogService(ILedgerService ledgerService, ISettingsService settingsService, ICustomerService customerService)
    {
        _ledgerService = ledgerService;
        _settingsService = settingsService;
        _customerService = customerService;
    }

    public async Task<bool> ShowAddAsync(EntryType type, int? presetCustomerId = null)
    {
        var customers = await _customerService.GetAllAsync();
        var viewModel = new EntryDialogViewModel(_ledgerService, _settingsService, customers, null, type, presetCustomerId);
        return ShowDialog(viewModel);
    }

    public async Task<bool> ShowEditAsync(LedgerEntry entry)
    {
        var customers = await _customerService.GetAllAsync();
        var viewModel = new EntryDialogViewModel(_ledgerService, _settingsService, customers, entry, entry.Type, entry.CustomerId);
        return ShowDialog(viewModel);
    }

    private static bool ShowDialog(EntryDialogViewModel viewModel)
    {
        var window = new EntryDialog
        {
            DataContext = viewModel,
            Owner = Application.Current.MainWindow
        };

        return window.ShowDialog() == true;
    }
}
