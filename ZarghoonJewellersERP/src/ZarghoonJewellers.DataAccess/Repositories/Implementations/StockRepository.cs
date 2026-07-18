using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class StockRepository : GenericRepository<Stock>, IStockRepository
{
    public StockRepository(ApplicationDbContext context) : base(context) { }

    public async Task<string> GenerateNextItemCodeAsync(CancellationToken cancellationToken = default)
    {
        int nextId = await Context.Stock.CountAsync(cancellationToken) + 1;
        string code;
        do
        {
            code = $"ITM-{nextId:D6}";
            nextId++;
        } while (await Context.Stock.AnyAsync(s => s.ItemCode == code, cancellationToken));

        return code;
    }

    public async Task<Stock?> GetByBarcodeAsync(string barcodeValue, CancellationToken cancellationToken = default)
        => await DbSet
            .Include(s => s.Category)
            .Include(s => s.Barcodes)
            .FirstOrDefaultAsync(s => s.Barcodes.Any(b => b.BarcodeValue == barcodeValue), cancellationToken);

    public async Task<IReadOnlyList<Stock>> GetLowStockItemsAsync(CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Include(s => s.Category)
            .Where(s => s.IsActive && s.Quantity <= s.MinimumStockLevel)
            .OrderBy(s => s.Quantity)
            .ToListAsync(cancellationToken);

    public async Task<decimal> GetTotalStockValueAsync(CancellationToken cancellationToken = default)
        => await DbSet.Where(s => s.IsActive).SumAsync(s => s.PurchaseValue, cancellationToken);

    public async Task<IReadOnlyList<Stock>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default)
    {
        searchTerm = searchTerm.Trim();
        return await DbSet.AsNoTracking()
            .Include(s => s.Category)
            .Where(s => s.ItemName.Contains(searchTerm) || s.ItemCode.Contains(searchTerm))
            .OrderBy(s => s.ItemName)
            .Take(50)
            .ToListAsync(cancellationToken);
    }
}
