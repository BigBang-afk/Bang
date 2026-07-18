using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class SupplierRepository : GenericRepository<Supplier>, ISupplierRepository
{
    public SupplierRepository(ApplicationDbContext context) : base(context) { }

    public async Task<string> GenerateNextSupplierCodeAsync(CancellationToken cancellationToken = default)
    {
        int nextId = await Context.Suppliers.CountAsync(cancellationToken) + 1;
        string code;
        do
        {
            code = $"SUP-{nextId:D5}";
            nextId++;
        } while (await Context.Suppliers.AnyAsync(s => s.SupplierCode == code, cancellationToken));

        return code;
    }

    public async Task<IReadOnlyList<Supplier>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default)
    {
        searchTerm = searchTerm.Trim();
        return await DbSet.AsNoTracking()
            .Where(s => s.CompanyName.Contains(searchTerm)
                     || s.SupplierCode.Contains(searchTerm)
                     || (s.Phone != null && s.Phone.Contains(searchTerm)))
            .OrderBy(s => s.CompanyName)
            .Take(50)
            .ToListAsync(cancellationToken);
    }

    public async Task<decimal> GetTotalPayableAsync(CancellationToken cancellationToken = default)
        => await DbSet.Where(s => s.IsActive).SumAsync(s => s.CurrentBalance, cancellationToken);
}
