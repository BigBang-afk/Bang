using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

public interface IStockService
{
    Task<IReadOnlyList<Stock>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Stock>> GetAllWithDetailsAsync(CancellationToken cancellationToken = default);
    Task<Stock?> GetByIdAsync(int stockId, CancellationToken cancellationToken = default);
    Task<Stock?> GetByBarcodeAsync(string barcodeValue, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Stock>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Stock>> GetLowStockAsync(CancellationToken cancellationToken = default);

    /// <summary>Creates the stock row, computes PurchaseValue from weight/rate, and generates + attaches a barcode.</summary>
    Task<Stock> CreateAsync(Stock stock, CancellationToken cancellationToken = default);
    Task UpdateAsync(Stock stock, CancellationToken cancellationToken = default);
    Task DeactivateAsync(int stockId, CancellationToken cancellationToken = default);
    Task<decimal> GetTotalStockValueAsync(CancellationToken cancellationToken = default);

    /// <summary>Generates a preview item code + serial number for a not-yet-saved row (Quick Entry grid,
    /// Quick Add form) without persisting anything.</summary>
    Task<(string ItemCode, string SerialNumber)> PreviewNextIdentifiersAsync(CancellationToken cancellationToken = default);

    /// <summary>Saves many new items (and generates a barcode for each) in a single transaction -
    /// used by the Quick Stock Entry grid and the Excel import wizard. Rows that fail validation
    /// are skipped and reported back rather than aborting the whole batch.</summary>
    Task<IReadOnlyList<Stock>> BulkCreateAsync(IReadOnlyList<Stock> items, CancellationToken cancellationToken = default);

    /// <summary>Parses an uploaded workbook into validated <see cref="Stock"/> rows (resolving Category/
    /// Karigar/Supplier by name) without saving anything - the caller reviews the result and then
    /// calls <see cref="BulkCreateAsync"/> with the valid rows.</summary>
    Task<StockImportResult> ParseExcelImportAsync(Stream fileStream, CancellationToken cancellationToken = default);

    Task UpdateStatusAsync(int stockId, string newStatus, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetDistinctBrandsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetDistinctCollectionsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetDistinctOccasionsAsync(CancellationToken cancellationToken = default);
}
