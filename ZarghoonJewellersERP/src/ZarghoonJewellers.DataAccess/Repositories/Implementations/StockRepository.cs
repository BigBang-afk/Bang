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

    public async Task<string> GenerateNextSerialNumberAsync(CancellationToken cancellationToken = default)
    {
        int nextId = await Context.Stock.CountAsync(cancellationToken) + 1;
        string serial;
        do
        {
            serial = $"SN-{DateTime.Now:yyMM}-{nextId:D6}";
            nextId++;
        } while (await Context.Stock.AnyAsync(s => s.SerialNumber == serial, cancellationToken));

        return serial;
    }

    public async Task<IReadOnlyList<Stock>> GetAllWithDetailsAsync(CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Include(s => s.Category)
            .Include(s => s.Karigar)
            .Include(s => s.Supplier)
            .Include(s => s.Barcodes)
            .OrderByDescending(s => s.CreatedDate)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<string>> GetDistinctBrandsAsync(CancellationToken cancellationToken = default)
        => await DbSet.Where(s => s.Brand != null && s.Brand != string.Empty)
            .Select(s => s.Brand!).Distinct().OrderBy(b => b).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<string>> GetDistinctCollectionsAsync(CancellationToken cancellationToken = default)
        => await DbSet.Where(s => s.Collection != null && s.Collection != string.Empty)
            .Select(s => s.Collection!).Distinct().OrderBy(c => c).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<string>> GetDistinctOccasionsAsync(CancellationToken cancellationToken = default)
        => await DbSet.Where(s => s.Occasion != null && s.Occasion != string.Empty)
            .Select(s => s.Occasion!).Distinct().OrderBy(o => o).ToListAsync(cancellationToken);
}
