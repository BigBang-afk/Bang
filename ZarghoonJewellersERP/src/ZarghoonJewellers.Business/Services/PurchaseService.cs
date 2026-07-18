using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class PurchaseService : IPurchaseService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public PurchaseService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<PurchaseResultDto> CreatePurchaseAsync(CreatePurchaseRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Lines.Count == 0)
            throw new BusinessRuleException("A purchase must contain at least one item.");

        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);

        var purchase = new Purchase
        {
            PurchaseNumber = await _unitOfWork.Purchases.GenerateNextPurchaseNumberAsync(cancellationToken),
            PurchaseDate = DateTime.Now,
            SupplierId = request.SupplierId,
            GoldRateAtPurchase = request.GoldRateAtPurchase,
            PaidAmount = request.PaidAmount,
            Status = "Confirmed",
            CreatedBy = request.CreatedBy,
            CreatedDate = DateTime.Now
        };

        decimal subTotal = 0, totalGross = 0, totalNet = 0;

        foreach (var line in request.Lines)
        {
            Stock? stock = null;
            if (line.StockId.HasValue)
            {
                stock = await _unitOfWork.Stock.GetByIdAsync(line.StockId.Value, cancellationToken)
                    ?? throw new BusinessRuleException($"Stock item #{line.StockId} was not found.");
                stock.Quantity += line.Quantity;
                stock.PurchaseRate = line.Rate;
                stock.PurchaseValue = stock.CalculateNetWeight() * stock.PurchaseRate * stock.Quantity;
                _unitOfWork.Stock.Update(stock);
            }
            else
            {
                stock = new Stock
                {
                    CategoryId = line.CategoryId ?? throw new BusinessRuleException("A category is required for new stock items."),
                    ItemName = line.ItemName,
                    Purity = line.Purity,
                    GrossWeight = line.GrossWeight,
                    StoneWeight = line.StoneWeight,
                    Quantity = line.Quantity,
                    PurchaseRate = line.Rate,
                    SupplierId = request.SupplierId,
                    ItemCode = await _unitOfWork.Stock.GenerateNextItemCodeAsync(cancellationToken),
                    CreatedDate = DateTime.Now
                };
                stock.PurchaseValue = stock.CalculateNetWeight() * stock.PurchaseRate * stock.Quantity;
                await _unitOfWork.Stock.AddAsync(stock, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken); // need StockId for the barcode + detail FK

                await _unitOfWork.Barcodes.AddAsync(new Barcode
                {
                    StockId = stock.StockId,
                    BarcodeValue = BarcodeHelper.GenerateStockBarcodeValue(stock.StockId),
                    BarcodeType = "Code128",
                    GeneratedDate = DateTime.Now
                }, cancellationToken);
            }

            purchase.PurchaseDetails.Add(new PurchaseDetail
            {
                StockId = stock.StockId,
                ItemName = line.ItemName.Length > 0 ? line.ItemName : stock.ItemName,
                Purity = line.Purity,
                GrossWeight = line.GrossWeight,
                StoneWeight = line.StoneWeight,
                Rate = line.Rate,
                Quantity = line.Quantity,
                Amount = line.Amount
            });

            subTotal += line.Amount;
            totalGross += line.GrossWeight * line.Quantity;
            totalNet += line.NetWeight * line.Quantity;
        }

        purchase.SubTotal = subTotal;
        purchase.TotalAmount = subTotal;
        purchase.TotalGrossWeight = totalGross;
        purchase.TotalNetWeight = totalNet;

        if (request.PaidAmount > purchase.TotalAmount)
            throw new BusinessRuleException("Paid amount cannot exceed the purchase total.");

        await _unitOfWork.Purchases.AddAsync(purchase, cancellationToken);

        var supplier = await _unitOfWork.Suppliers.GetByIdAsync(request.SupplierId, cancellationToken)
            ?? throw new BusinessRuleException("Supplier not found.");
        supplier.CurrentBalance += purchase.TotalAmount - request.PaidAmount;
        _unitOfWork.Suppliers.Update(supplier);

        CashLedgerEntry? cashEntry = null;
        if (request.PaidAmount > 0)
        {
            var lastCashBalance = await _unitOfWork.CashLedger.GetCurrentCashBalanceAsync(cancellationToken);
            cashEntry = new CashLedgerEntry
            {
                TransactionDate = DateTime.Now,
                TransactionType = "Payment",
                ReferenceType = "Purchase",
                Amount = request.PaidAmount,
                PaymentMode = "Cash",
                Description = $"Payment made for purchase {purchase.PurchaseNumber}",
                RunningBalance = lastCashBalance - request.PaidAmount,
                CreatedBy = request.CreatedBy,
                CreatedDate = DateTime.Now
            };
            await _unitOfWork.CashLedger.AddAsync(cashEntry, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (cashEntry is not null)
        {
            cashEntry.ReferenceId = purchase.PurchaseId;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        await _auditService.LogAsync(request.CreatedBy, "Insert", "Purchases", purchase.PurchaseId.ToString(), null,
            $"Purchase {purchase.PurchaseNumber} - {purchase.TotalAmount:C}", cancellationToken);

        return new PurchaseResultDto(purchase.PurchaseId, purchase.PurchaseNumber, purchase.TotalAmount, purchase.TotalAmount - request.PaidAmount);
    }

    public Task<Purchase?> GetWithDetailsAsync(int purchaseId, CancellationToken cancellationToken = default)
        => _unitOfWork.Purchases.GetWithDetailsAsync(purchaseId, cancellationToken);

    public Task<IReadOnlyList<Purchase>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => _unitOfWork.Purchases.GetRecentAsync(count, cancellationToken);
}
