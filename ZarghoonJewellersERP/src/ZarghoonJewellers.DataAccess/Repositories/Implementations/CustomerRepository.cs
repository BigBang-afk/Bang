using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

public class CustomerRepository : GenericRepository<Customer>, ICustomerRepository
{
    public CustomerRepository(ApplicationDbContext context) : base(context) { }

    public async Task<string> GenerateNextCustomerCodeAsync(CancellationToken cancellationToken = default)
    {
        int nextId = await Context.Customers.CountAsync(cancellationToken) + 1;
        // Re-check for collisions in case of deletions; loop guarantees a unique code.
        string code;
        do
        {
            code = $"CUS-{nextId:D5}";
            nextId++;
        } while (await Context.Customers.AnyAsync(c => c.CustomerCode == code, cancellationToken));

        return code;
    }

    public async Task<IReadOnlyList<Customer>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default)
    {
        searchTerm = searchTerm.Trim();
        return await DbSet.AsNoTracking()
            .Where(c => c.FullName.Contains(searchTerm)
                     || c.CustomerCode.Contains(searchTerm)
                     || (c.Phone != null && c.Phone.Contains(searchTerm)))
            .OrderBy(c => c.FullName)
            .Take(50)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Customer>> GetTopByBalanceAsync(int count, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .Where(c => c.IsActive && c.CurrentBalance > 0)
            .OrderByDescending(c => c.CurrentBalance)
            .Take(count)
            .ToListAsync(cancellationToken);

    public async Task<decimal> GetTotalReceivableAsync(CancellationToken cancellationToken = default)
        => await DbSet.Where(c => c.IsActive).SumAsync(c => c.CurrentBalance, cancellationToken);

    public async Task<IReadOnlyList<Customer>> GetRecentlyAddedAsync(int count, CancellationToken cancellationToken = default)
        => await DbSet.AsNoTracking()
            .OrderByDescending(c => c.CreatedDate)
            .Take(count)
            .ToListAsync(cancellationToken);
}
