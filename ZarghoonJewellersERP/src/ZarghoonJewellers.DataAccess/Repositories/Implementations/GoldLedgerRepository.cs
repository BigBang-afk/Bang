using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class GoldLedgerRepository : GenericRepository<GoldLedgerEntry>, IGoldLedgerRepository
{
    public GoldLedgerRepository(ApplicationDbContext context) : base(context) { }

    public async Task<decimal> GetLastRunningBalanceAsync(string entityType, int entityId, CancellationToken cancellationToken = default)
    {
        var last = await DbSet.AsNoTracking()
            .Where(g => g.EntityType == entityType && g.EntityId == entityId)
            .OrderByDescending(g => g.GoldLedgerId)
            .FirstOrDefaultAsync(cancellationToken);

        return last?.RunningBalance ?? 0m;
    }

    public async Task<IReadOnlyList<GoldLedgerEntry>> GetHistoryForEntityAsync(string entityType, int entityId, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Where(g => g.EntityType == entityType && g.EntityId == entityId)
            .OrderByDescending(g => g.TransactionDate)
            .ToListAsync(cancellationToken);
}
