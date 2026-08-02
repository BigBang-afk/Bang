using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class CashLedgerService : ICashLedgerService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public CashLedgerService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public Task<decimal> GetCurrentBalanceAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.CashLedger.GetCurrentCashBalanceAsync(cancellationToken);

    public Task<IReadOnlyList<CashLedgerEntry>> GetRecentAsync(int count, CancellationToken cancellationToken = default)
        => _unitOfWork.CashLedger.GetRecentAsync(count, cancellationToken);

    public async Task<CashLedgerEntry> PostManualEntryAsync(string transactionType, decimal amount, string paymentMode,
        int? bankAccountId, string? description, int createdBy, string? entityType = null, int? entityId = null,
        CancellationToken cancellationToken = default)
    {
        if (transactionType is not ("Receipt" or "Payment"))
            throw new BusinessRuleException("Transaction type must be either 'Receipt' or 'Payment'.");
        if (amount <= 0)
            throw new BusinessRuleException("Amount must be greater than zero.");

        var lastBalance = await _unitOfWork.CashLedger.GetCurrentCashBalanceAsync(cancellationToken);

        var entry = new CashLedgerEntry
        {
            TransactionDate = DateTime.Now,
            TransactionType = transactionType,
            ReferenceType = "Manual",
            Amount = amount,
            PaymentMode = paymentMode,
            BankAccountId = bankAccountId,
            Description = description,
            EntityType = entityType,
            EntityId = entityId,
            RunningBalance = LedgerCalculator.ComputeRunningCashBalance(lastBalance, transactionType, paymentMode, amount),
            CreatedBy = createdBy,
            CreatedDate = DateTime.Now
        };

        await _unitOfWork.CashLedger.AddAsync(entry, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(createdBy, "Insert", "CashLedger", entry.CashLedgerId.ToString(), null, description, cancellationToken);
        return entry;
    }

    public async Task<CashLedgerEntry> PostCustomerAdvanceAsync(int customerId, decimal amount, string paymentMode,
        string? description, int createdBy, CancellationToken cancellationToken = default)
    {
        if (amount <= 0)
            throw new BusinessRuleException("Amount must be greater than zero.");

        var customer = await _unitOfWork.Customers.GetByIdAsync(customerId, cancellationToken)
            ?? throw new BusinessRuleException("Customer not found.");

        var lastBalance = await _unitOfWork.CashLedger.GetCurrentCashBalanceAsync(cancellationToken);
        var entry = new CashLedgerEntry
        {
            TransactionDate = DateTime.Now,
            TransactionType = "Receipt",
            ReferenceType = "Advance",
            Amount = amount,
            PaymentMode = paymentMode,
            Description = description ?? $"Advance payment from {customer.FullName}",
            EntityType = "Customer",
            EntityId = customerId,
            RunningBalance = LedgerCalculator.ComputeRunningCashBalance(lastBalance, "Receipt", paymentMode, amount),
            CreatedBy = createdBy,
            CreatedDate = DateTime.Now
        };

        await _unitOfWork.CashLedger.AddAsync(entry, cancellationToken);

        // Reduces what the customer owes (or puts them in credit if it exceeds their balance) -
        // that credit is then available to apply against their next invoice's PaidAmount.
        customer.CurrentBalance -= amount;
        _unitOfWork.Customers.Update(customer);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        entry.ReferenceId = entry.CashLedgerId;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(createdBy, "Insert", "CashLedger", entry.CashLedgerId.ToString(), null, entry.Description, cancellationToken);
        return entry;
    }

    public Task<IReadOnlyList<CashLedgerEntry>> GetEntityLedgerAsync(string entityType, int entityId,
        DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken cancellationToken = default)
        => _unitOfWork.CashLedger.GetEntityLedgerAsync(entityType, entityId, fromDate, toDate, cancellationToken);
}
