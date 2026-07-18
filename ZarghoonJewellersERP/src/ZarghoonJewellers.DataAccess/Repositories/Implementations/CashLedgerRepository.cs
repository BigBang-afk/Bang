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
}
