using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class RepairOrderRepository : GenericRepository<RepairOrder>, IRepairOrderRepository
{
    private static readonly string[] OpenStatuses = { "Pending", "InProgress" };

    public RepairOrderRepository(ApplicationDbContext context) : base(context) { }

    public async Task<string> GenerateNextOrderNumberAsync(CancellationToken cancellationToken = default)
    {
        int nextId = await Context.RepairOrders.CountAsync(cancellationToken) + 1;
        string number;
        do
        {
            number = $"RO-{DateTime.Now:yyyyMM}-{nextId:D4}";
            nextId++;
        } while (await Context.RepairOrders.AnyAsync(r => r.OrderNumber == number, cancellationToken));

        return number;
    }

    public async Task<IReadOnlyList<RepairOrder>> GetPendingAsync(int count, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Include(r => r.Customer)
            .Include(r => r.Karigar)
            .Where(r => OpenStatuses.Contains(r.Status))
            .OrderBy(r => r.PromisedDate)
            .Take(count)
            .ToListAsync(cancellationToken);

    public async Task<int> CountPendingAsync(CancellationToken cancellationToken = default)
        => await DbSet.CountAsync(r => OpenStatuses.Contains(r.Status), cancellationToken);
}
