using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface IRepairOrderRepository : IGenericRepository<RepairOrder>
{
    Task<string> GenerateNextOrderNumberAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RepairOrder>> GetPendingAsync(int count, CancellationToken cancellationToken = default);
    Task<int> CountPendingAsync(CancellationToken cancellationToken = default);
}
