using TradingJournal.Core.Data;
using TradingJournal.Core.Models;
using TradingJournal.Core.Services;
using Xunit;

namespace TradingJournal.Tests;

public class LedgerServiceTests : IDisposable
{
    private readonly string _dbPath;
    private readonly JournalDbContext _db;
    private readonly SettingsService _settingsService;
    private readonly LedgerService _ledgerService;

    public LedgerServiceTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"tradingjournal-tests-{Guid.NewGuid():N}.db");
        _db = new JournalDbContext(_dbPath);
        _db.Database.EnsureCreated();
        _settingsService = new SettingsService(_db);
        _ledgerService = new LedgerService(_db, _settingsService);
    }

    [Fact]
    public async Task AddEntryAsync_ForProfit_ComputesPkrAndGoldFromCurrentSettings()
    {
        await _settingsService.UpdateSettingsAsync(usdToPkrRate: 280m, goldRatePerUnit: 250000m, goldUnitLabel: "Tola");

        var entry = await _ledgerService.AddEntryAsync(EntryType.Profit, 100m, customerId: null, DateTime.Now, notes: null);

        Assert.Equal(28000m, entry.AmountPkr);
        Assert.Equal(28000m / 250000m, entry.AmountGold);
        Assert.Equal(280m, entry.UsdToPkrRateApplied);
    }

    [Fact]
    public async Task GetDashboardSummaryAsync_NetsProfitAndLoss()
    {
        await _settingsService.UpdateSettingsAsync(280m, 250000m, "Tola");

        await _ledgerService.AddEntryAsync(EntryType.Profit, 100m, null, DateTime.Now, null);
        await _ledgerService.AddEntryAsync(EntryType.Loss, 40m, null, DateTime.Now, null);

        var summary = await _ledgerService.GetDashboardSummaryAsync();

        Assert.Equal(100m, summary.TotalProfitUsd);
        Assert.Equal(40m, summary.TotalLossUsd);
        Assert.Equal(60m, summary.NetUsd);
        Assert.Equal(60m * 280m, summary.NetPkr);
    }

    [Fact]
    public async Task AddEntryAsync_ThrowsForNonPositiveAmount()
    {
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => _ledgerService.AddEntryAsync(EntryType.Profit, 0m, null, DateTime.Now, null));
    }

    public void Dispose()
    {
        _db.Dispose();
        if (File.Exists(_dbPath))
            File.Delete(_dbPath);
    }
}
