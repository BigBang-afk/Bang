using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class PurchaseRepository : GenericRepository<Purchase>, IPurchaseRepository
{
    public PurchaseRepository(ApplicationDbContext context) : base(context) { }

    public async Task<string> GenerateNextPurchaseNumberAsync(CancellationToken cancellationToken = default)
    {
        int nextId = await Context.Purchases.CountAsync(cancellationToken) + 1;
        string number;
        do
        {
            number = $"PUR-{DateTime.Now:yyyyMM}-{nextId:D5}";
            nextId++;
        } while (await Context.Purchases.AnyAsync(p => p.PurchaseNumber == number, cancellationToken));

        return number;
    }

    public async Task<Purchase?> GetWithDetailsAsync(int purchaseId, CancellationToken cancellationToken = default)
        => await DbSet
            .Include(p => p.Supplier)
            .Include(p => p.PurchaseDetails).ThenInclude(d => d.Stock)
            .FirstOrDefaultAsync(p => p.PurchaseId == purchaseId, cancellationToken);

    public async Task<decimal> GetTotalPurchasesForDateAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = start.AddDays(1);
        return await DbSet
            .Where(p => p.PurchaseDate >= start && p.PurchaseDate < end && p.Status != "Cancelled")
            .SumAsync(p => p.TotalAmount, cancellationToken);
    }

    public async Task<IReadOnlyList<Purchase>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Include(p => p.Supplier)
            .OrderByDescending(p => p.PurchaseDate)
            .Take(count)
            .ToListAsync(cancellationToken);
}
