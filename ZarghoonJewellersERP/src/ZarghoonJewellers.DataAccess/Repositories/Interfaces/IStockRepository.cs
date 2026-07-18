using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface IStockRepository : IGenericRepository<Stock>
{
    Task<string> GenerateNextItemCodeAsync(CancellationToken cancellationToken = default);
    Task<Stock?> GetByBarcodeAsync(string barcodeValue, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Stock>> GetLowStockItemsAsync(CancellationToken cancellationToken = default);
    Task<decimal> GetTotalStockValueAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Stock>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default);
}
