using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface IStockRepository : IGenericRepository<Stock>
{
    Task<string> GenerateNextItemCodeAsync(CancellationToken cancellationToken = default);
    Task<string> GenerateNextSerialNumberAsync(CancellationToken cancellationToken = default);
    Task<Stock?> GetByBarcodeAsync(string barcodeValue, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Stock>> GetLowStockItemsAsync(CancellationToken cancellationToken = default);
    Task<decimal> GetTotalStockValueAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Stock>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default);

    /// <summary>Full item list with Category/Karigar/Supplier eagerly loaded, for the inventory
    /// grid's search/filter/sort/group which all run client-side over the loaded set.</summary>
    Task<IReadOnlyList<Stock>> GetAllWithDetailsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetDistinctBrandsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetDistinctCollectionsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetDistinctOccasionsAsync(CancellationToken cancellationToken = default);
}
