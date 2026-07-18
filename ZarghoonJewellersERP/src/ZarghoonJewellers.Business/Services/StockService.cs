using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class StockService : IStockService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public StockService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<Stock>> GetAllAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Stock.GetAllAsync(cancellationToken);

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
        stock.PurchaseValue = stock.CalculateNetWeight() * stock.PurchaseRate * stock.Quantity + stock.StoneValue;
        stock.CreatedDate = DateTime.Now;

        await _unitOfWork.Stock.AddAsync(stock, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken); // need StockId for the barcode FK

        var barcode = new Barcode
        {
            StockId = stock.StockId,
            BarcodeValue = BarcodeHelper.GenerateStockBarcodeValue(stock.StockId),
            BarcodeType = "Code128",
            GeneratedDate = DateTime.Now
        };
        await _unitOfWork.Barcodes.AddAsync(barcode, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(null, "Insert", "Stock", stock.StockId.ToString(), null, stock.ItemName, cancellationToken);
        return stock;
    }

    public async Task UpdateAsync(Stock stock, CancellationToken cancellationToken = default)
    {
        stock.PurchaseValue = stock.CalculateNetWeight() * stock.PurchaseRate * stock.Quantity + stock.StoneValue;
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
}
