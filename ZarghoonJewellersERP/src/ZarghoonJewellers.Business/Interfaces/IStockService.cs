using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

public interface IStockService
{
    Task<IReadOnlyList<Stock>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Stock?> GetByIdAsync(int stockId, CancellationToken cancellationToken = default);
    Task<Stock?> GetByBarcodeAsync(string barcodeValue, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Stock>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Stock>> GetLowStockAsync(CancellationToken cancellationToken = default);

    /// <summary>Creates the stock row, computes PurchaseValue from weight/rate, and generates + attaches a barcode.</summary>
    Task<Stock> CreateAsync(Stock stock, CancellationToken cancellationToken = default);
    Task UpdateAsync(Stock stock, CancellationToken cancellationToken = default);
    Task DeactivateAsync(int stockId, CancellationToken cancellationToken = default);
    Task<decimal> GetTotalStockValueAsync(CancellationToken cancellationToken = default);
}
