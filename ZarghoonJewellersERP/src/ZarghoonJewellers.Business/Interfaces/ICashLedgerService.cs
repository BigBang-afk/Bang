using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

public interface ICashLedgerService
{
    Task<decimal> GetCurrentBalanceAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CashLedgerEntry>> GetRecentAsync(int count, CancellationToken cancellationToken = default);

    /// <summary>Posts a free-standing manual cash movement (not tied to an invoice/purchase), e.g. an owner's
    /// cash withdrawal or a bank deposit reconciliation entry. Pass <paramref name="entityType"/>/
    /// <paramref name="entityId"/> ("Customer"/"Supplier"/"Karigar") to tag it against that party's ledger.</summary>
    Task<CashLedgerEntry> PostManualEntryAsync(string transactionType, decimal amount, string paymentMode,
        int? bankAccountId, string? description, int createdBy, string? entityType = null, int? entityId = null,
        CancellationToken cancellationToken = default);

    /// <summary>Records a customer advance payment: posts a Receipt tagged to the customer and reduces
    /// their outstanding balance (or puts them in credit) immediately.</summary>
    Task<CashLedgerEntry> PostCustomerAdvanceAsync(int customerId, decimal amount, string paymentMode,
        string? description, int createdBy, CancellationToken cancellationToken = default);

    /// <summary>Every cash movement tagged to one Customer/Supplier/Karigar - the Ledger screens.</summary>
    Task<IReadOnlyList<CashLedgerEntry>> GetEntityLedgerAsync(string entityType, int entityId,
        DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken cancellationToken = default);
}
