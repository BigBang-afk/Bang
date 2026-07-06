using System.Collections.ObjectModel;
using System.Windows.Input;
using TradingJournal.App.Common;
using TradingJournal.Core.Models;
using TradingJournal.Core.Services;

namespace TradingJournal.App.ViewModels;

public class DashboardViewModel : ViewModelBase
{
    private readonly ILedgerService _ledgerService;

    public DashboardViewModel(ILedgerService ledgerService)
    {
        _ledgerService = ledgerService;
        RecentEntries = new ObservableCollection<LedgerEntry>();
        RefreshCommand = new RelayCommand(async () => await RefreshAsync());
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
