using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class StockService : IStockService
{
    private static readonly string[] ValidStatuses = { "Active", "Sold", "Reserved", "Repair", "Melted", "Returned" };

    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public StockService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<Stock>> GetAllAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetAllAsync(cancellationToken);

    public Task<IReadOnlyList<Stock>> GetAllWithDetailsAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetAllWithDetailsAsync(cancellationToken);

    public Task<Stock?> GetByIdAsync(int stockId, CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetByIdAsync(stockId, cancellationToken);

    public Task<Stock?> GetByBarcodeAsync(string barcodeValue, CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetByBarcodeAsync(barcodeValue, cancellationToken);

    public Task<IReadOnlyList<Stock>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.SearchAsync(searchTerm, cancellationToken);

    public Task<IReadOnlyList<Stock>> GetLowStockAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetLowStockItemsAsync(cancellationToken);

    public async Task<Stock> CreateAsync(Stock stock, CancellationToken cancellationToken = default)
    {
        stock.ItemCode = await _unitOfWork.Stock.GenerateNextItemCodeAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(stock.SerialNumber))
            stock.SerialNumber = await _unitOfWork.Stock.GenerateNextSerialNumberAsync(cancellationToken);
        RecalculatePurchaseValue(stock);
        stock.CreatedDate = DateTime.Now;

        await _unitOfWork.Stock.AddAsync(stock, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken); // need StockId for the barcode FK

        await AttachBarcodeAsync(stock, cancellationToken);

        await _auditService.LogAsync(null, "Insert", "Stock", stock.StockId.ToString(), null, stock.ItemName, cancellationToken);
        return stock;
    }

    public async Task UpdateAsync(Stock stock, CancellationToken cancellationToken = default)
    {
        RecalculatePurchaseValue(stock);
        _unitOfWork.Stock.Update(stock);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(null, "Update", "Stock", stock.StockId.ToString(), null, stock.ItemName, cancellationToken);
    }

    public async Task DeactivateAsync(int stockId, CancellationToken cancellationToken = default)
    {
        var stock = await _unitOfWork.Stock.GetByIdAsync(stockId, cancellationToken);
        if (stock is null) return;

        if (stock.Quantity > 0)
            throw new BusinessRuleException("Cannot remove a stock item that still has quantity on hand.");

        stock.IsActive = false;
        _unitOfWork.Stock.Update(stock);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(null, "Delete", "Stock", stockId.ToString(), null, "Deactivated", cancellationToken);
    }

    public Task<decimal> GetTotalStockValueAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetTotalStockValueAsync(cancellationToken);

    public async Task<(string ItemCode, string SerialNumber)> PreviewNextIdentifiersAsync(CancellationToken cancellationToken = default)
    {
        var itemCode = await _unitOfWork.Stock.GenerateNextItemCodeAsync(cancellationToken);
        var serial = await _unitOfWork.Stock.GenerateNextSerialNumberAsync(cancellationToken);
        return (itemCode, serial);
    }

    public async Task<IReadOnlyList<Stock>> BulkCreateAsync(IReadOnlyList<Stock> items, CancellationToken cancellationToken = default)
    {
        if (items.Count == 0) return Array.Empty<Stock>();

        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);

        foreach (var stock in items)
        {
            stock.ItemCode = await _unitOfWork.Stock.GenerateNextItemCodeAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(stock.SerialNumber))
                stock.SerialNumber = await _unitOfWork.Stock.GenerateNextSerialNumberAsync(cancellationToken);
            RecalculatePurchaseValue(stock);
            stock.CreatedDate = DateTime.Now;
            await _unitOfWork.Stock.AddAsync(stock, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken); // assigns StockIds for the barcode FKs

        foreach (var stock in items)
            await AttachBarcodeAsync(stock, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await _auditService.LogAsync(null, "Insert", "Stock", null, null, $"Bulk added {items.Count} stock items", cancellationToken);
        return items;
    }

    public async Task<StockImportResult> ParseExcelImportAsync(Stream fileStream, CancellationToken cancellationToken = default)
    {
        var rawRows = ExcelHelper.ReadRowsAsDictionaries(fileStream);
        var result = new StockImportResult();

        var categories = await _unitOfWork.StockCategories.GetAllAsync(cancellationToken);
        var karigars = await _unitOfWork.Karigars.GetAllAsync(cancellationToken);
        var suppliers = await _unitOfWork.Suppliers.GetAllAsync(cancellationToken);

        int rowNumber = 1; // row 1 in the file is the header row, so data starts at row 2
        foreach (var raw in rawRows)
        {
            rowNumber++;
            var rowResult = new StockImportRowResult { RowNumber = rowNumber };

            string ItemVal(string key) => raw.TryGetValue(key, out var v) ? v : string.Empty;

            var itemName = ItemVal(StockImportColumns.ItemName);
            rowResult.ItemNameRaw = itemName;
            if (string.IsNullOrWhiteSpace(itemName))
                rowResult.Errors.Add("Item Name is required.");

            var categoryName = ItemVal(StockImportColumns.Category);
            rowResult.CategoryNameRaw = categoryName;
            var category = categories.FirstOrDefault(c => c.CategoryName.Equals(categoryName, StringComparison.OrdinalIgnoreCase));
            if (category is null)
                rowResult.Errors.Add($"Category '{categoryName}' was not found.");

            var grossWeight = ParseDecimal(ItemVal(StockImportColumns.GrossWeight));
            var stoneWeight = ParseDecimal(ItemVal(StockImportColumns.StoneWeight));
            if (grossWeight <= 0)
                rowResult.Errors.Add("Gross Weight must be greater than zero.");
            if (stoneWeight > grossWeight)
                rowResult.Errors.Add("Stone Weight cannot exceed Gross Weight.");

            var purity = ItemVal(StockImportColumns.Purity);
            if (string.IsNullOrWhiteSpace(purity))
                purity = "22K";

            var quantity = int.TryParse(ItemVal(StockImportColumns.Quantity), out var q) && q > 0 ? q : 1;

            if (rowResult.Errors.Count == 0)
            {
                var karigarName = ItemVal(StockImportColumns.Karigar);
                var supplierName = ItemVal(StockImportColumns.Supplier);

                rowResult.Stock = new Stock
                {
                    ItemName = itemName,
                    CategoryId = category!.CategoryId,
                    MetalType = string.IsNullOrWhiteSpace(ItemVal(StockImportColumns.MetalType)) ? "Gold" : ItemVal(StockImportColumns.MetalType),
                    Purity = purity,
                    GrossWeight = grossWeight,
                    StoneWeight = stoneWeight,
                    MakingChargeType = string.IsNullOrWhiteSpace(ItemVal(StockImportColumns.MakingChargeType)) ? "PerGram" : ItemVal(StockImportColumns.MakingChargeType),
                    MakingChargeValue = ParseDecimal(ItemVal(StockImportColumns.MakingChargeValue)),
                    LaborCharges = ParseDecimal(ItemVal(StockImportColumns.LaborCharges)),
                    StoneValue = ParseDecimal(ItemVal(StockImportColumns.StoneValue)),
                    Quantity = quantity,
                    PurchaseRate = ParseDecimal(ItemVal(StockImportColumns.PurchaseRate)),
                    SaleRate = ParseDecimal(ItemVal(StockImportColumns.SaleRate)),
                    MinimumStockLevel = ParseDecimal(ItemVal(StockImportColumns.MinimumStockLevel)),
                    LossPercentage = ParseDecimal(ItemVal(StockImportColumns.LossPercentage)),
                    KarigarId = karigars.FirstOrDefault(k => k.FullName.Equals(karigarName, StringComparison.OrdinalIgnoreCase))?.KarigarId,
                    SupplierId = suppliers.FirstOrDefault(s => s.CompanyName.Equals(supplierName, StringComparison.OrdinalIgnoreCase))?.SupplierId,
                    HallmarkNumber = NullIfEmpty(ItemVal(StockImportColumns.HallmarkNumber)),
                    DesignNumber = NullIfEmpty(ItemVal(StockImportColumns.DesignNumber)),
                    Brand = NullIfEmpty(ItemVal(StockImportColumns.Brand)),
                    Collection = NullIfEmpty(ItemVal(StockImportColumns.CollectionName)),
                    Occasion = NullIfEmpty(ItemVal(StockImportColumns.Occasion)),
                    Gender = string.IsNullOrWhiteSpace(ItemVal(StockImportColumns.Gender)) ? "Unisex" : ItemVal(StockImportColumns.Gender),
                    ShelfNumber = NullIfEmpty(ItemVal(StockImportColumns.ShelfNumber)),
                    BatchNumber = NullIfEmpty(ItemVal(StockImportColumns.BatchNumber)),
                    ItemStatus = "Active"
                };
            }

            result.Rows.Add(rowResult);
        }

        return result;
    }

    public async Task UpdateStatusAsync(int stockId, string newStatus, CancellationToken cancellationToken = default)
    {
        if (!ValidStatuses.Contains(newStatus))
            throw new BusinessRuleException($"'{newStatus}' is not a valid item status.");

        var stock = await _unitOfWork.Stock.GetByIdAsync(stockId, cancellationToken)
            ?? throw new BusinessRuleException("Stock item not found.");

        var oldStatus = stock.ItemStatus;
        stock.ItemStatus = newStatus;
        _unitOfWork.Stock.Update(stock);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(null, "Update", "Stock", stockId.ToString(), oldStatus, newStatus, cancellationToken);
    }

    public Task<IReadOnlyList<string>> GetDistinctBrandsAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetDistinctBrandsAsync(cancellationToken);

    public Task<IReadOnlyList<string>> GetDistinctCollectionsAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetDistinctCollectionsAsync(cancellationToken);

    public Task<IReadOnlyList<string>> GetDistinctOccasionsAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetDistinctOccasionsAsync(cancellationToken);

    private static void RecalculatePurchaseValue(Stock stock)
    {
        stock.PurchaseValue = JewelryCalculator.CalculatePurchaseValue(
            stock.CalculateNetWeight(), stock.PurchaseRate, stock.Quantity,
            stock.MakingChargeType, stock.MakingChargeValue, stock.LaborCharges, stock.StoneValue);
    }

    private async Task AttachBarcodeAsync(Stock stock, CancellationToken cancellationToken)
    {
        var barcode = new Barcode
        {
            StockId = stock.StockId,
            BarcodeValue = BarcodeHelper.GenerateStockBarcodeValue(stock.StockId),
            BarcodeType = "Code128",
            GeneratedDate = DateTime.Now
        };
        await _unitOfWork.Barcodes.AddAsync(barcode, cancellationToken);
    }

    private static decimal ParseDecimal(string text) => decimal.TryParse(text, out var value) ? value : 0;

    private static string? NullIfEmpty(string text) => string.IsNullOrWhiteSpace(text) ? null : text;
}
