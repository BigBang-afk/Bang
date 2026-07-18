using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface IDailyGoldRateRepository : IGenericRepository<DailyGoldRate>
{
    Task<DailyGoldRate?> GetLatestAsync(CancellationToken cancellationToken = default);
    Task<DailyGoldRate?> GetByDateAsync(DateOnly date, CancellationToken cancellationToken = default);
}
