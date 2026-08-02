using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface ICashLedgerRepository : IGenericRepository<CashLedgerEntry>
{
    /// <summary>The running cash-drawer balance as of the most recent posted entry (0 if none yet).</summary>
    Task<decimal> GetCurrentCashBalanceAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CashLedgerEntry>> GetRecentAsync(int count, CancellationToken cancellationToken = default);

    /// <summary>Every cash movement tagged against one Customer/Supplier/Karigar, oldest first, for
    /// the Customer/Supplier/Karigar Ledger screens and statements.</summary>
    Task<IReadOnlyList<CashLedgerEntry>> GetEntityLedgerAsync(string entityType, int entityId, DateOnly? fromDate, DateOnly? toDate, CancellationToken cancellationToken = default);

    /// <summary>Cash movements posted between two instants - used by shift closing to compute expected cash.</summary>
    Task<IReadOnlyList<CashLedgerEntry>> GetBetweenAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default);
}
