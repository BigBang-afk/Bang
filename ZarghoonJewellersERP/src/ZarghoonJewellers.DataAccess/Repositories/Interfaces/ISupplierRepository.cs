using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface ISupplierRepository : IGenericRepository<Supplier>
{
    Task<string> GenerateNextSupplierCodeAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Supplier>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default);
    Task<decimal> GetTotalPayableAsync(CancellationToken cancellationToken = default);
}
