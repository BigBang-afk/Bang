using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

/// <summary>
/// Orchestrates the point-of-sale checkout: validates stock availability, persists the
/// invoice + line items, decrements inventory, updates the customer's running balance and
/// posts cash/gold ledger movements - all as one atomic unit of work. Also owns Hold/Recall
/// (suspending a cart without touching stock/ledgers until it's actually completed) and
/// Return/Exchange processing (which reuses the Invoice/InvoiceDetail structure rather than a
/// parallel table - see <see cref="Domain.Entities.Invoice.InvoiceType"/>).
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
            Status = "Confirmed",
            InvoiceType = "Sale",
            ShiftId = request.ShiftId,
            CreatedBy = request.CreatedBy,
            CreatedDate = DateTime.Now
        };

        await ApplyLinesAndDecrementStockAsync(invoice, request, cancellationToken);
        await _unitOfWork.Invoices.AddAsync(invoice, cancellationToken);

        var cashEntries = await SettleCustomerAndPaymentsAsync(invoice, request, cancellationToken);

        // First save assigns the generated InvoiceId; each cash entry's ReferenceId is then
        // back-filled against the same tracked instances (no re-query needed) and saved again.
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (cashEntries.Count > 0)
        {
            foreach (var entry in cashEntries) entry.ReferenceId = invoice.InvoiceId;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        await _auditService.LogAsync(request.CreatedBy, "Insert", "Invoices", invoice.InvoiceId.ToString(), null,
            $"Invoice {invoice.InvoiceNumber} - {invoice.TotalAmount:C}", cancellationToken);

        return new InvoiceResultDto(invoice.InvoiceId, invoice.InvoiceNumber, invoice.TotalAmount, invoice.BalanceAmount);
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

    public async Task<InvoiceResultDto> HoldInvoiceAsync(CreateInvoiceRequest request, string holdLabel, CancellationToken cancellationToken = default)
    {
        if (request.Lines.Count == 0)
            throw new BusinessRuleException("A held invoice must contain at least one item.");

        var invoice = new Invoice
        {
            InvoiceNumber = await _unitOfWork.Invoices.GenerateNextInvoiceNumberAsync(cancellationToken),
            InvoiceDate = DateTime.Now,
            CustomerId = request.CustomerId,
            GoldRateAtSale = request.GoldRateAtSale,
            Status = "Held",
            InvoiceType = "Sale",
            HoldLabel = holdLabel,
            ShiftId = request.ShiftId,
            CreatedBy = request.CreatedBy,
            CreatedDate = DateTime.Now
        };

        var (details, totals) = CalculateInvoiceTotals(request);
        invoice.InvoiceDetails = details;
        ApplyTotals(invoice, totals);

        // A hold is a suspended cart, not a sale - deliberately no stock decrement, no ledger
        // posting and no customer balance change until CompleteHeldInvoiceAsync actually
        // finalizes it, so several held carts can safely reference the same low-stock item.
        await _unitOfWork.Invoices.AddAsync(invoice, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(request.CreatedBy, "Insert", "Invoices", invoice.InvoiceId.ToString(), null,
            $"Held invoice {invoice.InvoiceNumber} ({holdLabel})", cancellationToken);

        return new InvoiceResultDto(invoice.InvoiceId, invoice.InvoiceNumber, invoice.TotalAmount, invoice.TotalAmount);
    }

    public Task<IReadOnlyList<Invoice>> GetHeldInvoicesAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Invoices.GetHeldInvoicesAsync(cancellationToken);

    public async Task DeleteHeldInvoiceAsync(int invoiceId, CancellationToken cancellationToken = default)
    {
        var invoice = await _unitOfWork.Invoices.GetWithDetailsAsync(invoiceId, cancellationToken)
            ?? throw new BusinessRuleException("Invoice not found.");

        if (invoice.Status != "Held")
            throw new BusinessRuleException("Only a held invoice can be discarded this way.");

        _unitOfWork.Invoices.Remove(invoice);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(null, "Delete", "Invoices", invoiceId.ToString(), "Held", null, cancellationToken);
    }

    public async Task<InvoiceResultDto> CompleteHeldInvoiceAsync(int invoiceId, CreateInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Lines.Count == 0)
            throw new BusinessRuleException("An invoice must contain at least one item.");

        var invoice = await _unitOfWork.Invoices.GetWithDetailsAsync(invoiceId, cancellationToken)
            ?? throw new BusinessRuleException("Invoice not found.");

        if (invoice.Status != "Held")
            throw new BusinessRuleException("This invoice is not currently held.");

        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);

        // The cart may have been edited since it was held (items added/removed/re-priced), so
        // the old detail lines are discarded and rebuilt from the current request - the held
        // row's identity (InvoiceId/InvoiceNumber) is preserved rather than creating a new invoice.
        invoice.InvoiceDetails.Clear();
        invoice.CustomerId = request.CustomerId;
        invoice.GoldRateAtSale = request.GoldRateAtSale;
        invoice.Status = "Confirmed";
        invoice.ShiftId = request.ShiftId ?? invoice.ShiftId;

        await ApplyLinesAndDecrementStockAsync(invoice, request, cancellationToken);
        _unitOfWork.Invoices.Update(invoice);

        // invoice.InvoiceId is already a real, non-zero id here (it's an existing held row), so
        // each cash entry's ReferenceId is set correctly in one pass - no back-fill save needed.
        await SettleCustomerAndPaymentsAsync(invoice, request, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await _auditService.LogAsync(request.CreatedBy, "Update", "Invoices", invoice.InvoiceId.ToString(), "Held",
            $"Completed - {invoice.TotalAmount:C}", cancellationToken);

        return new InvoiceResultDto(invoice.InvoiceId, invoice.InvoiceNumber, invoice.TotalAmount, invoice.BalanceAmount);
    }

    public async Task<ReturnResultDto> ProcessReturnAsync(ProcessReturnRequest request, CancellationToken cancellationToken = default)
    {
        if (request.ReturnLines.Count == 0)
            throw new BusinessRuleException("Select at least one line to return.");

        var original = await _unitOfWork.Invoices.GetWithDetailsAsync(request.OriginalInvoiceId, cancellationToken)
            ?? throw new BusinessRuleException("Original invoice not found.");

        await using var transaction = await _unitOfWork.BeginTransactionAsync(cancellationToken);

        var isExchange = request.NewLines.Count > 0;
        var returnInvoice = new Invoice
        {
            InvoiceNumber = await _unitOfWork.Invoices.GenerateNextInvoiceNumberAsync(cancellationToken),
            InvoiceDate = DateTime.Now,
            CustomerId = original.CustomerId,
            GoldRateAtSale = request.GoldRateAtSale,
            Status = "Confirmed",
            InvoiceType = isExchange ? "Exchange" : "Return",
            OriginalInvoiceId = original.InvoiceId,
            CreatedBy = request.CreatedBy,
            CreatedDate = DateTime.Now
        };

        decimal totalRefund = 0, returnGross = 0, returnNet = 0;
        foreach (var line in request.ReturnLines)
        {
            var originalDetail = original.InvoiceDetails.FirstOrDefault(d => d.InvoiceDetailId == line.OriginalInvoiceDetailId)
                ?? throw new BusinessRuleException("One of the selected lines does not belong to the original invoice.");

            if (line.Quantity <= 0 || line.Quantity > originalDetail.Quantity)
                throw new BusinessRuleException($"Invalid return quantity for '{originalDetail.StockId}'. Original quantity: {originalDetail.Quantity}.");

            var stock = await _unitOfWork.Stock.GetByIdAsync(line.StockId, cancellationToken);
            if (stock is not null)
            {
                stock.Quantity += line.Quantity;
                _unitOfWork.Stock.Update(stock);
            }

            returnInvoice.InvoiceDetails.Add(new InvoiceDetail
            {
                StockId = line.StockId,
                Purity = originalDetail.Purity,
                GrossWeight = -Math.Abs(originalDetail.GrossWeight / originalDetail.Quantity * line.Quantity),
                StoneWeight = -Math.Abs(originalDetail.StoneWeight / originalDetail.Quantity * line.Quantity),
                Rate = line.Rate,
                MakingCharge = 0,
                StoneValue = 0,
                Quantity = line.Quantity,
                LineTotal = -Math.Abs(line.RefundAmount)
            });

            totalRefund += Math.Abs(line.RefundAmount);
            returnGross += Math.Abs(originalDetail.GrossWeight / originalDetail.Quantity * line.Quantity);
            returnNet += line.NetWeight;
        }

        decimal newLinesTotal = 0, newGross = 0, newNet = 0, newMakingTotal = 0;
        foreach (var line in request.NewLines)
        {
            var stock = await _unitOfWork.Stock.GetByIdAsync(line.StockId, cancellationToken)
                ?? throw new BusinessRuleException($"Stock item #{line.StockId} was not found.");

            if (stock.Quantity < line.Quantity)
                throw new BusinessRuleException($"Insufficient stock for '{stock.ItemName}'. Available: {stock.Quantity}, requested: {line.Quantity}.");

            stock.Quantity -= line.Quantity;
            _unitOfWork.Stock.Update(stock);

            returnInvoice.InvoiceDetails.Add(new InvoiceDetail
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

            newLinesTotal += line.LineTotal;
            newMakingTotal += line.MakingCharge;
            newGross += line.GrossWeight * line.Quantity;
            newNet += line.NetWeight * line.Quantity;
        }

        var netAmount = newLinesTotal - totalRefund;
        returnInvoice.SubTotal = newLinesTotal - newMakingTotal - totalRefund;
        returnInvoice.MakingChargeTotal = newMakingTotal;
        returnInvoice.TotalGrossWeight = newGross - returnGross;
        returnInvoice.TotalNetWeight = newNet - returnNet;
        returnInvoice.TotalAmount = netAmount;
        returnInvoice.PaidAmount = 0;

        await _unitOfWork.Invoices.AddAsync(returnInvoice, cancellationToken);

        var customer = await _unitOfWork.Customers.GetByIdAsync(original.CustomerId, cancellationToken)
            ?? throw new BusinessRuleException("Customer not found.");
        customer.CurrentBalance += netAmount;
        _unitOfWork.Customers.Update(customer);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await _auditService.LogAsync(request.CreatedBy, "Insert", "Invoices", returnInvoice.InvoiceId.ToString(), null,
            $"{returnInvoice.InvoiceType} {returnInvoice.InvoiceNumber} against {original.InvoiceNumber}", cancellationToken);

        return new ReturnResultDto(
            returnInvoice.InvoiceId, returnInvoice.InvoiceNumber, totalRefund,
            isExchange ? returnInvoice.InvoiceId : null,
            isExchange ? returnInvoice.InvoiceNumber : null,
            netAmount > 0 ? netAmount : 0);
    }

    public Task<IReadOnlyList<Invoice>> SearchInvoicesAsync(string? searchTerm, DateOnly? fromDate, DateOnly? toDate,
        string? status, int? customerId, CancellationToken cancellationToken = default)
        => _unitOfWork.Invoices.SearchInvoicesAsync(searchTerm, fromDate, toDate, status, customerId, cancellationToken);

    public Task<IReadOnlyList<Invoice>> GetByShiftAsync(int shiftId, CancellationToken cancellationToken = default)
        => _unitOfWork.Invoices.GetByShiftAsync(shiftId, cancellationToken);

    // ------------------------------------------------------------------ shared helpers

    private readonly record struct InvoiceTotals(decimal SubTotal, decimal MakingChargeTotal, decimal TotalGross,
        decimal TotalNet, decimal DiscountAmount, decimal TaxAmount, decimal TotalAmount);

    private static (List<InvoiceDetail> Details, InvoiceTotals Totals) CalculateInvoiceTotals(CreateInvoiceRequest request)
    {
        var details = new List<InvoiceDetail>();
        decimal subTotal = 0, makingChargeTotal = 0, totalGross = 0, totalNet = 0;

        foreach (var line in request.Lines)
        {
            details.Add(new InvoiceDetail
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

        var preDiscountTotal = subTotal + makingChargeTotal;
        var discountAmount = request.DiscountPercentage > 0
            ? Math.Round(preDiscountTotal * request.DiscountPercentage / 100m, 2)
            : request.DiscountAmount;

        var taxableAmount = preDiscountTotal - discountAmount;
        var taxAmount = request.TaxPercentage > 0
            ? Math.Round(taxableAmount * request.TaxPercentage / 100m, 2)
            : request.TaxAmount;

        var totalAmount = taxableAmount + taxAmount;

        return (details, new InvoiceTotals(subTotal, makingChargeTotal, totalGross, totalNet, discountAmount, taxAmount, totalAmount));
    }

    private static void ApplyTotals(Invoice invoice, InvoiceTotals totals)
    {
        invoice.SubTotal = totals.SubTotal;
        invoice.MakingChargeTotal = totals.MakingChargeTotal;
        invoice.TotalGrossWeight = totals.TotalGross;
        invoice.TotalNetWeight = totals.TotalNet;
        invoice.DiscountAmount = totals.DiscountAmount;
        invoice.TaxAmount = totals.TaxAmount;
        invoice.TotalAmount = totals.TotalAmount;
    }

    /// <summary>Builds the (possibly-rebuilt) detail lines, validates stock availability, decrements
    /// it, and stamps the invoice's calculated totals. Shared by a brand-new sale and by finalizing a
    /// previously-held one.</summary>
    private async Task ApplyLinesAndDecrementStockAsync(Invoice invoice, CreateInvoiceRequest request, CancellationToken cancellationToken)
    {
        var (details, totals) = CalculateInvoiceTotals(request);

        foreach (var line in request.Lines)
        {
            var stock = await _unitOfWork.Stock.GetByIdAsync(line.StockId, cancellationToken)
                ?? throw new BusinessRuleException($"Stock item #{line.StockId} was not found.");

            if (stock.Quantity < line.Quantity)
                throw new BusinessRuleException($"Insufficient stock for '{stock.ItemName}'. Available: {stock.Quantity}, requested: {line.Quantity}.");

            stock.Quantity -= line.Quantity;
            _unitOfWork.Stock.Update(stock);
        }

        foreach (var detail in details)
            invoice.InvoiceDetails.Add(detail);

        ApplyTotals(invoice, totals);

        if ((request.SplitPayments.Count > 0 ? request.SplitPayments.Sum(p => p.Amount) : request.PaidAmount) > invoice.TotalAmount)
            throw new BusinessRuleException("Paid amount cannot exceed the invoice total.");
    }

    /// <summary>Updates the customer's running balance and posts the payment(s) - either a single
    /// PaidAmount/PaymentMode (unchanged original behavior) or a full split payment across several
    /// methods - plus the old-gold-exchange gold ledger entry. Shared by new sales and completed holds.
    /// Returns the newly created cash ledger entries so the caller can back-fill their ReferenceId
    /// once a brand-new invoice's id is known (see <see cref="CreateInvoiceAsync"/>).</summary>
    private async Task<List<CashLedgerEntry>> SettleCustomerAndPaymentsAsync(Invoice invoice, CreateInvoiceRequest request, CancellationToken cancellationToken)
    {
        var effectivePaid = request.SplitPayments.Count > 0 ? request.SplitPayments.Sum(p => p.Amount) : request.PaidAmount;
        invoice.PaidAmount = effectivePaid;
        invoice.PaymentMode = request.SplitPayments.Count > 1 ? "Split" : request.PaymentMode;

        var customer = await _unitOfWork.Customers.GetByIdAsync(request.CustomerId, cancellationToken)
            ?? throw new BusinessRuleException("Customer not found.");
        customer.CurrentBalance += invoice.TotalAmount - effectivePaid;
        _unitOfWork.Customers.Update(customer);

        var paymentLines = request.SplitPayments.Count > 0
            ? request.SplitPayments
            : (effectivePaid > 0 ? new List<PaymentLineRequest> { new() { PaymentMethod = request.PaymentMode, Amount = effectivePaid } } : new List<PaymentLineRequest>());

        var createdCashEntries = new List<CashLedgerEntry>();
        var runningCashBalance = await _unitOfWork.CashLedger.GetCurrentCashBalanceAsync(cancellationToken);

        foreach (var payment in paymentLines)
        {
            runningCashBalance = LedgerCalculator.ComputeRunningCashBalance(runningCashBalance, "Receipt", payment.PaymentMethod, payment.Amount);

            var cashEntry = new CashLedgerEntry
            {
                TransactionDate = DateTime.Now,
                TransactionType = "Receipt",
                ReferenceType = "Invoice",
                ReferenceId = invoice.InvoiceId == 0 ? null : invoice.InvoiceId,
                Amount = payment.Amount,
                PaymentMode = payment.PaymentMethod,
                BankAccountId = payment.BankAccountId,
                Description = $"Payment received for invoice {invoice.InvoiceNumber}",
                EntityType = "Customer",
                EntityId = invoice.CustomerId,
                RunningBalance = runningCashBalance,
                CreatedBy = request.CreatedBy,
                CreatedDate = DateTime.Now
            };
            await _unitOfWork.CashLedger.AddAsync(cashEntry, cancellationToken);
            createdCashEntries.Add(cashEntry);

            invoice.Payments.Add(new InvoicePayment
            {
                PaymentMethod = payment.PaymentMethod,
                Amount = payment.Amount,
                ReferenceNumber = payment.ReferenceNumber,
                BankAccountId = payment.BankAccountId,
                CreatedDate = DateTime.Now
            });
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

        return createdCashEntries;
    }
}
