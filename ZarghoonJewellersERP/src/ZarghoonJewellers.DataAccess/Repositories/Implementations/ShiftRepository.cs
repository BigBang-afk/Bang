using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class ShiftRepository : GenericRepository<Shift>, IShiftRepository
{
    public ShiftRepository(ApplicationDbContext context) : base(context) { }

    public async Task<Shift?> GetOpenShiftForCashierAsync(int cashierUserId, CancellationToken cancellationToken = default)
        => await DbSet.FirstOrDefaultAsync(s => s.CashierUserId == cashierUserId && s.Status == "Open", cancellationToken);

    public async Task<IReadOnlyList<Shift>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Include(s => s.CashierUser)
            .OrderByDescending(s => s.OpenedAt)
            .Take(count)
            .ToListAsync(cancellationToken);
}
