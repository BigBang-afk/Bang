using TradingJournal.Core.Models;

namespace TradingJournal.Core.Services;

public interface ILedgerService
{
    Task<LedgerEntry> AddEntryAsync(EntryType type, decimal amountUsd, int? customerId, DateTime date, string? notes);
    Task<List<LedgerEntry>> GetAllEntriesAsync();
    Task<List<LedgerEntry>> GetEntriesForCustomerAsync(int customerId);
    Task<List<LedgerEntry>> GetRecentEntriesAsync(int count);
    Task DeleteEntryAsync(int entryId);
    Task<DashboardSummary> GetDashboardSummaryAsync();
}

public record DashboardSummary(
    decimal TotalProfitUsd,
    decimal TotalLossUsd,
    decimal NetUsd,
    decimal NetPkr,
    decimal NetGold,
    string GoldUnitLabel,
    decimal CurrentUsdToPkrRate,
    decimal CurrentGoldRate,
    int EntryCount);
