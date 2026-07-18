using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

public interface ICashLedgerService
{
    Task<decimal> GetCurrentBalanceAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CashLedgerEntry>> GetRecentAsync(int count, CancellationToken cancellationToken = default);

    /// <summary>Posts a free-standing manual cash movement (not tied to an invoice/purchase), e.g. an owner's
    /// cash withdrawal or a bank deposit reconciliation entry.</summary>
    Task<CashLedgerEntry> PostManualEntryAsync(string transactionType, decimal amount, string paymentMode,
        int? bankAccountId, string? description, int createdBy, CancellationToken cancellationToken = default);
}
