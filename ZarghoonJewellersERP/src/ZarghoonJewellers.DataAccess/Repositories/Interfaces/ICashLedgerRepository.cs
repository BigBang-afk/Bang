using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface ICashLedgerRepository : IGenericRepository<CashLedgerEntry>
{
    /// <summary>The running cash-drawer balance as of the most recent posted entry (0 if none yet).</summary>
    Task<decimal> GetCurrentCashBalanceAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CashLedgerEntry>> GetRecentAsync(int count, CancellationToken cancellationToken = default);
}
