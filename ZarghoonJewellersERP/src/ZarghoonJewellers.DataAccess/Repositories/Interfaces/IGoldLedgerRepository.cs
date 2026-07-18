using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface IGoldLedgerRepository : IGenericRepository<GoldLedgerEntry>
{
    Task<decimal> GetLastRunningBalanceAsync(string entityType, int entityId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GoldLedgerEntry>> GetHistoryForEntityAsync(string entityType, int entityId, CancellationToken cancellationToken = default);
}
