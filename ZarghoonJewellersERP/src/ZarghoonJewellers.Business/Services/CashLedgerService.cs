using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
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
        int? bankAccountId, string? description, int createdBy, CancellationToken cancellationToken = default)
    {
        if (transactionType is not ("Receipt" or "Payment"))
            throw new BusinessRuleException("Transaction type must be either 'Receipt' or 'Payment'.");
        if (amount <= 0)
            throw new BusinessRuleException("Amount must be greater than zero.");

        var lastBalance = await _unitOfWork.CashLedger.GetCurrentCashBalanceAsync(cancellationToken);
        var signedAmount = transactionType == "Receipt" ? amount : -amount;

        var entry = new CashLedgerEntry
        {
            TransactionDate = DateTime.Now,
            TransactionType = transactionType,
            ReferenceType = "Manual",
            Amount = amount,
            PaymentMode = paymentMode,
            BankAccountId = bankAccountId,
            Description = description,
            RunningBalance = lastBalance + signedAmount,
            CreatedBy = createdBy,
            CreatedDate = DateTime.Now
        };

        await _unitOfWork.CashLedger.AddAsync(entry, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(createdBy, "Insert", "CashLedger", entry.CashLedgerId.ToString(), null, description, cancellationToken);
        return entry;
    }
}
