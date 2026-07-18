using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class DailyGoldRateRepository : GenericRepository<DailyGoldRate>, IDailyGoldRateRepository
{
    public DailyGoldRateRepository(ApplicationDbContext context) : base(context) { }

    public async Task<DailyGoldRate?> GetLatestAsync(CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .OrderByDescending(g => g.RateDate)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<DailyGoldRate?> GetByDateAsync(DateOnly date, CancellationToken cancellationToken = default)
        => await DbSet.FirstOrDefaultAsync(g => g.RateDate == date, cancellationToken);
}
