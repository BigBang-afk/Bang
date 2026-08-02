using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface IShiftRepository : IGenericRepository<Shift>
{
    Task<Shift?> GetOpenShiftForCashierAsync(int cashierUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Shift>> GetRecentAsync(int count, CancellationToken cancellationToken = default);
}
