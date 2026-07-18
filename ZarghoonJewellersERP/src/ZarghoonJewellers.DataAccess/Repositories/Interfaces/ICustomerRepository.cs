using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface ICustomerRepository : IGenericRepository<Customer>
{
    Task<string> GenerateNextCustomerCodeAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Customer>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Customer>> GetTopByBalanceAsync(int count, CancellationToken cancellationToken = default);
    Task<decimal> GetTotalReceivableAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Customer>> GetRecentlyAddedAsync(int count, CancellationToken cancellationToken = default);
}
