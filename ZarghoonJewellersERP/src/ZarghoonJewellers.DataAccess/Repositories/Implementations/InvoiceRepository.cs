using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class InvoiceRepository : GenericRepository<Invoice>, IInvoiceRepository
{
    public InvoiceRepository(ApplicationDbContext context) : base(context) { }

    public async Task<string> GenerateNextInvoiceNumberAsync(CancellationToken cancellationToken = default)
    {
        int nextId = await Context.Invoices.CountAsync(cancellationToken) + 1;
        string number;
        do
        {
            number = $"INV-{DateTime.Now:yyyyMM}-{nextId:D5}";
            nextId++;
        } while (await Context.Invoices.AnyAsync(i => i.InvoiceNumber == number, cancellationToken));

        return number;
    }

    public async Task<Invoice?> GetWithDetailsAsync(int invoiceId, CancellationToken cancellationToken = default)
        => await DbSet
            .Include(i => i.Customer)
            .Include(i => i.InvoiceDetails).ThenInclude(d => d.Stock)
            .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId, cancellationToken);

    public async Task<decimal> GetTotalSalesForDateAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = start.AddDays(1);
        return await DbSet
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate < end && i.Status != "Cancelled")
            .SumAsync(i => i.TotalAmount, cancellationToken);
    }

    public async Task<IReadOnlyList<Invoice>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Include(i => i.Customer)
            .OrderByDescending(i => i.InvoiceDate)
            .Take(count)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<(DateOnly Date, decimal TotalSales)>> GetDailySalesTotalsAsync(int days, CancellationToken cancellationToken = default)
    {
        var startDate = DateTime.Now.Date.AddDays(-(days - 1));

        var raw = await DbSet
            .Where(i => i.InvoiceDate >= startDate && i.Status != "Cancelled")
            .GroupBy(i => i.InvoiceDate.Date)
            .Select(g => new { Date = g.Key, Total = g.Sum(i => i.TotalAmount) })
            .ToListAsync(cancellationToken);

        var lookup = raw.ToDictionary(r => DateOnly.FromDateTime(r.Date), r => r.Total);

        var result = new List<(DateOnly, decimal)>();
        for (int i = 0; i < days; i++)
        {
            var day = DateOnly.FromDateTime(startDate.AddDays(i));
            result.Add((day, lookup.TryGetValue(day, out var total) ? total : 0m));
        }

        return result;
    }
}
