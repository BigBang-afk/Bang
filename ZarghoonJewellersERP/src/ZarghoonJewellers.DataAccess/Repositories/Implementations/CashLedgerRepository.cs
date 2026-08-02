using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class CashLedgerRepository : GenericRepository<CashLedgerEntry>, ICashLedgerRepository
{
    public CashLedgerRepository(ApplicationDbContext context) : base(context) { }

    public async Task<decimal> GetCurrentCashBalanceAsync(CancellationToken cancellationToken = default)
    {
        var last = await DbSet.AsNoTracking()
            .OrderByDescending(c => c.CashLedgerId)
            .FirstOrDefaultAsync(cancellationToken);

        return last?.RunningBalance ?? 0m;
    }

    public async Task<IReadOnlyList<CashLedgerEntry>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Include(c => c.BankAccount)
            .OrderByDescending(c => c.TransactionDate)
            .Take(count)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CashLedgerEntry>> GetEntityLedgerAsync(string entityType, int entityId,
        DateOnly? fromDate, DateOnly? toDate, CancellationToken cancellationToken = default)
    {
        var query = DbSet.AsNoTracking().Where(c => c.EntityType == entityType && c.EntityId == entityId);

        if (fromDate.HasValue)
            query = query.Where(c => c.TransactionDate >= fromDate.Value.ToDateTime(TimeOnly.MinValue));
        if (toDate.HasValue)
            query = query.Where(c => c.TransactionDate < toDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue));

        return await query.OrderBy(c => c.TransactionDate).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<CashLedgerEntry>> GetBetweenAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Where(c => c.TransactionDate >= from && c.TransactionDate <= to)
            .OrderBy(c => c.TransactionDate)
            .ToListAsync(cancellationToken);
}
