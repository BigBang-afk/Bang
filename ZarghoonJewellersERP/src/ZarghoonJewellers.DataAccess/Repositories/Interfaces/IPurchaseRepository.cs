using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface IPurchaseRepository : IGenericRepository<Purchase>
{
    Task<string> GenerateNextPurchaseNumberAsync(CancellationToken cancellationToken = default);
    Task<Purchase?> GetWithDetailsAsync(int purchaseId, CancellationToken cancellationToken = default);
    Task<decimal> GetTotalPurchasesForDateAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Purchase>> GetRecentAsync(int count, CancellationToken cancellationToken = default);
}
