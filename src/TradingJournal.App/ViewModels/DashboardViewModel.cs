using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Input;
using TradingJournal.App.Common;
using TradingJournal.Core.Models;
using TradingJournal.Core.Services;

namespace TradingJournal.App.ViewModels;

public class DashboardViewModel : ViewModelBase
{
    private readonly ILedgerService _ledgerService;
    private readonly EntryDialogService _entryDialogService;

    public DashboardViewModel(ILedgerService ledgerService, EntryDialogService entryDialogService)
    {
        _ledgerService = ledgerService;
        _entryDialogService = entryDialogService;
        RecentEntries = new ObservableCollection<LedgerEntry>();
        RefreshCommand = new RelayCommand(async () => await RefreshAsync());
        EditEntryCommand = new RelayCommand(async param => await EditEntryAsync(param as LedgerEntry));
        DeleteEntryCommand = new RelayCommand(async param => await DeleteEntryAsync(param as LedgerEntry));
        _ = RefreshAsync();
    }

    private decimal _totalProfitUsd;
    public decimal TotalProfitUsd { get => _totalProfitUsd; set => SetProperty(ref _totalProfitUsd, value); }

    private decimal _totalLossUsd;
    public decimal TotalLossUsd { get => _totalLossUsd; set => SetProperty(ref _totalLossUsd, value); }

    private decimal _netUsd;
    public decimal NetUsd { get => _netUsd; set => SetProperty(ref _netUsd, value); }

    private decimal _netPkr;
    public decimal NetPkr { get => _netPkr; set => SetProperty(ref _netPkr, value); }

    private decimal _netGold;
    public decimal NetGold { get => _netGold; set => SetProperty(ref _netGold, value); }

    private string _goldUnitLabel = "Tola";
    public string GoldUnitLabel { get => _goldUnitLabel; set => SetProperty(ref _goldUnitLabel, value); }

    private decimal _currentUsdToPkrRate;
    public decimal CurrentUsdToPkrRate { get => _currentUsdToPkrRate; set => SetProperty(ref _currentUsdToPkrRate, value); }

    private decimal _currentGoldRate;
    public decimal CurrentGoldRate { get => _currentGoldRate; set => SetProperty(ref _currentGoldRate, value); }

    private int _entryCount;
    public int EntryCount { get => _entryCount; set => SetProperty(ref _entryCount, value); }

    public ObservableCollection<LedgerEntry> RecentEntries { get; }

    public ICommand RefreshCommand { get; }
    public ICommand EditEntryCommand { get; }
    public ICommand DeleteEntryCommand { get; }

    private async Task EditEntryAsync(LedgerEntry? entry)
    {
        if (entry is null)
            return;

        var saved = await _entryDialogService.ShowEditAsync(entry);
        if (saved)
            await RefreshAsync();
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
        await RefreshAsync();
    }

    public async Task RefreshAsync()
    {
        var summary = await _ledgerService.GetDashboardSummaryAsync();

        TotalProfitUsd = summary.TotalProfitUsd;
        TotalLossUsd = summary.TotalLossUsd;
        NetUsd = summary.NetUsd;
        NetPkr = summary.NetPkr;
        NetGold = summary.NetGold;
        GoldUnitLabel = summary.GoldUnitLabel;
        CurrentUsdToPkrRate = summary.CurrentUsdToPkrRate;
        CurrentGoldRate = summary.CurrentGoldRate;
        EntryCount = summary.EntryCount;

        var recent = await _ledgerService.GetRecentEntriesAsync(15);
        RecentEntries.Clear();
        foreach (var entry in recent)
            RecentEntries.Add(entry);
    }
}
