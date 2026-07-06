using Microsoft.EntityFrameworkCore;
using TradingJournal.Core.Data;
using TradingJournal.Core.Models;

namespace TradingJournal.Core.Services;

public class LedgerService : ILedgerService
{
    private readonly JournalDbContext _db;
    private readonly ISettingsService _settingsService;

    public LedgerService(JournalDbContext db, ISettingsService settingsService)
    {
        _db = db;
        _settingsService = settingsService;
    }

    public async Task<LedgerEntry> AddEntryAsync(EntryType type, decimal amountUsd, int? customerId, DateTime date, string? notes)
    {
        if (amountUsd <= 0)
            throw new ArgumentOutOfRangeException(nameof(amountUsd), "Amount must be greater than zero.");

        var settings = await _settingsService.GetSettingsAsync();
        var (pkr, gold) = CalculationService.ConvertUsd(amountUsd, settings.UsdToPkrRate, settings.GoldRatePerUnit);

        var entry = new LedgerEntry
        {
            CustomerId = customerId,
            Type = type,
            AmountUsd = amountUsd,
            UsdToPkrRateApplied = settings.UsdToPkrRate,
            GoldRateApplied = settings.GoldRatePerUnit,
            GoldUnitLabel = settings.GoldUnitLabel,
            AmountPkr = pkr,
            AmountGold = gold,
            Date = date,
            Notes = notes
        };

        _db.LedgerEntries.Add(entry);
        await _db.SaveChangesAsync();
        return entry;
    }

    public async Task<List<LedgerEntry>> GetAllEntriesAsync()
    {
        return await _db.LedgerEntries
            .Include(e => e.Customer)
            .OrderByDescending(e => e.Date)
            .ToListAsync();
    }

    public async Task<List<LedgerEntry>> GetEntriesForCustomerAsync(int customerId)
    {
        return await _db.LedgerEntries
            .Include(e => e.Customer)
            .Where(e => e.CustomerId == customerId)
            .OrderBy(e => e.Date)
            .ToListAsync();
    }

    public async Task<List<LedgerEntry>> GetRecentEntriesAsync(int count)
    {
        return await _db.LedgerEntries
            .Include(e => e.Customer)
            .OrderByDescending(e => e.Date)
            .Take(count)
            .ToListAsync();
    }

    public async Task DeleteEntryAsync(int entryId)
    {
        var entry = await _db.LedgerEntries.FindAsync(entryId);
        if (entry is not null)
        {
            _db.LedgerEntries.Remove(entry);
            await _db.SaveChangesAsync();
        }
    }

    public async Task<DashboardSummary> GetDashboardSummaryAsync()
    {
        var settings = await _settingsService.GetSettingsAsync();
        var entries = await _db.LedgerEntries.ToListAsync();

        var totalProfitUsd = entries.Where(e => e.Type == EntryType.Profit).Sum(e => e.AmountUsd);
        var totalLossUsd = entries.Where(e => e.Type == EntryType.Loss).Sum(e => e.AmountUsd);
        var netUsd = totalProfitUsd - totalLossUsd;

        // Net PKR/gold are derived from each entry's own snapshot rates (historically accurate),
        // not recomputed from today's rate.
        var netPkr = entries.Sum(e => e.SignedAmountPkr);
        var netGold = entries.Sum(e => e.SignedAmountGold);

        return new DashboardSummary(
            TotalProfitUsd: totalProfitUsd,
            TotalLossUsd: totalLossUsd,
            NetUsd: netUsd,
            NetPkr: netPkr,
            NetGold: netGold,
            GoldUnitLabel: settings.GoldUnitLabel,
            CurrentUsdToPkrRate: settings.UsdToPkrRate,
            CurrentGoldRate: settings.GoldRatePerUnit,
            EntryCount: entries.Count);
    }
}
