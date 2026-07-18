using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

/// <summary>
/// Orchestrates the point-of-sale checkout: validates stock availability, persists the
/// invoice + line items, decrements inventory, updates the customer's running balance and
/// posts cash/gold ledger movements - all as one atomic unit of work.
/// </summary>
public class InvoiceService : IInvoiceService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public InvoiceService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<InvoiceResultDto> CreateInvoiceAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Lines.Count == 0)
            throw new BusinessRuleException("An invoice must contain at least one item.");

        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);

        var invoice = new Invoice
        {
            InvoiceNumber = await _unitOfWork.Invoices.GenerateNextInvoiceNumberAsync(cancellationToken),
            InvoiceDate = DateTime.Now,
            CustomerId = request.CustomerId,
            GoldRateAtSale = request.GoldRateAtSale,
            DiscountAmount = request.DiscountAmount,
            TaxAmount = request.TaxAmount,
            PaidAmount = request.PaidAmount,
            PaymentMode = request.PaymentMode,
            OldGoldExchangeWeight = request.OldGoldExchangeWeight,
            Status = "Confirmed",
            CreatedBy = request.CreatedBy,
            CreatedDate = DateTime.Now
        };

        decimal subTotal = 0, makingChargeTotal = 0, totalGross = 0, totalNet = 0;

        foreach (var line in request.Lines)
        {
            var stock = await _unitOfWork.Stock.GetByIdAsync(line.StockId, cancellationToken)
                ?? throw new BusinessRuleException($"Stock item #{line.StockId} was not found.");

            if (stock.Quantity < line.Quantity)
                throw new BusinessRuleException($"Insufficient stock for '{stock.ItemName}'. Available: {stock.Quantity}, requested: {line.Quantity}.");

            stock.Quantity -= line.Quantity;
            _unitOfWork.Stock.Update(stock);

            invoice.InvoiceDetails.Add(new InvoiceDetail
            {
                StockId = line.StockId,
                Purity = line.Purity,
                GrossWeight = line.GrossWeight,
                StoneWeight = line.StoneWeight,
                Rate = line.Rate,
                MakingCharge = line.MakingCharge,
                StoneValue = line.StoneValue,
                Quantity = line.Quantity,
                LineTotal = line.LineTotal
            });

            subTotal += (line.NetWeight * line.Rate) + line.StoneValue;
            makingChargeTotal += line.MakingCharge;
            totalGross += line.GrossWeight * line.Quantity;
            totalNet += line.NetWeight * line.Quantity;
        }

        invoice.SubTotal = subTotal;
        invoice.MakingChargeTotal = makingChargeTotal;
        invoice.TotalGrossWeight = totalGross;
        invoice.TotalNetWeight = totalNet;
        invoice.TotalAmount = subTotal + makingChargeTotal + request.TaxAmount - request.DiscountAmount;

        if (request.PaidAmount > invoice.TotalAmount)
            throw new BusinessRuleException("Paid amount cannot exceed the invoice total.");

        await _unitOfWork.Invoices.AddAsync(invoice, cancellationToken);

        var customer = await _unitOfWork.Customers.GetByIdAsync(request.CustomerId, cancellationToken)
            ?? throw new BusinessRuleException("Customer not found.");
        customer.CurrentBalance += invoice.TotalAmount - request.PaidAmount;
        _unitOfWork.Customers.Update(customer);

        CashLedgerEntry? cashEntry = null;
        if (request.PaidAmount > 0)
        {
            var lastCashBalance = await _unitOfWork.CashLedger.GetCurrentCashBalanceAsync(cancellationToken);
            cashEntry = new CashLedgerEntry
            {
                TransactionDate = DateTime.Now,
                TransactionType = "Receipt",
                ReferenceType = "Invoice",
                Amount = request.PaidAmount,
                PaymentMode = request.PaymentMode,
                Description = $"Payment received for invoice {invoice.InvoiceNumber}",
                RunningBalance = lastCashBalance + request.PaidAmount,
                CreatedBy = request.CreatedBy,
                CreatedDate = DateTime.Now
            };
            await _unitOfWork.CashLedger.AddAsync(cashEntry, cancellationToken);
        }

        if (request.OldGoldExchangeWeight > 0)
        {
            var lastGoldBalance = await _unitOfWork.GoldLedger.GetLastRunningBalanceAsync("Customer", request.CustomerId, cancellationToken);
            await _unitOfWork.GoldLedger.AddAsync(new GoldLedgerEntry
            {
                TransactionDate = DateTime.Now,
                EntityType = "Customer",
                EntityId = request.CustomerId,
                TransactionType = "Received", // shop received old gold from the customer as exchange
                Purity = "22K",
                Weight = request.OldGoldExchangeWeight,
                ReferenceType = "Invoice",
                Description = $"Old gold exchange against invoice {invoice.InvoiceNumber}",
                RunningBalance = lastGoldBalance + request.OldGoldExchangeWeight,
                CreatedBy = request.CreatedBy,
                CreatedDate = DateTime.Now
            }, cancellationToken);

            // Old-gold exchange is tracked as its own running gold-credit balance rather than
            // being auto-converted to cash and netted against invoice.BalanceAmount - the cashier
            // decides per transaction whether to cash it out (a separate CashLedger receipt/payment)
            // or leave it on account for the customer to redeem later. "Received" moves the balance
            // in the shop's favor per the shared sign convention (positive = shop owes the entity gold).
            customer.CurrentGoldBalance += request.OldGoldExchangeWeight;
        }

        // First save assigns the generated InvoiceId; the cash entry's ReferenceId is then
        // back-filled against the same tracked instance (no re-query needed) and saved again.
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (cashEntry is not null)
        {
            cashEntry.ReferenceId = invoice.InvoiceId;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        await _auditService.LogAsync(request.CreatedBy, "Insert", "Invoices", invoice.InvoiceId.ToString(), null,
            $"Invoice {invoice.InvoiceNumber} - {invoice.TotalAmount:C}", cancellationToken);

        return new InvoiceResultDto(invoice.InvoiceId, invoice.InvoiceNumber, invoice.TotalAmount, invoice.TotalAmount - request.PaidAmount);
    }

    public Task<Invoice?> GetWithDetailsAsync(int invoiceId, CancellationToken cancellationToken = default)
        => _unitOfWork.Invoices.GetWithDetailsAsync(invoiceId, cancellationToken);

    public Task<IReadOnlyList<Invoice>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => _unitOfWork.Invoices.GetRecentAsync(count, cancellationToken);

    public async Task CancelInvoiceAsync(int invoiceId, CancellationToken cancellationToken = default)
    {
        var invoice = await _unitOfWork.Invoices.GetWithDetailsAsync(invoiceId, cancellationToken)
            ?? throw new BusinessRuleException("Invoice not found.");

        if (invoice.Status == "Cancelled")
            return;

        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);

        foreach (var detail in invoice.InvoiceDetails)
        {
            var stock = await _unitOfWork.Stock.GetByIdAsync(detail.StockId, cancellationToken);
            if (stock is not null)
            {
                stock.Quantity += detail.Quantity;
                _unitOfWork.Stock.Update(stock);
            }
        }

        var customer = await _unitOfWork.Customers.GetByIdAsync(invoice.CustomerId, cancellationToken);
        if (customer is not null)
        {
            customer.CurrentBalance -= invoice.BalanceAmount;
            _unitOfWork.Customers.Update(customer);
        }

        invoice.Status = "Cancelled";
        _unitOfWork.Invoices.Update(invoice);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await _auditService.LogAsync(null, "Update", "Invoices", invoiceId.ToString(), "Confirmed", "Cancelled", cancellationToken);
    }
}
