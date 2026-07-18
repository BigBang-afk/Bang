using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

public interface IGoldLedgerService
{
    Task<IReadOnlyList<GoldLedgerEntry>> GetHistoryForEntityAsync(string entityType, int entityId, CancellationToken cancellationToken = default);

    /// <summary>Posts a gold movement against a Customer/Supplier/Karigar and keeps that entity's
    /// CurrentGoldBalance in sync in the same transaction.</summary>
    Task<GoldLedgerEntry> PostEntryAsync(string entityType, int entityId, string transactionType, string purity,
        decimal weight, string? referenceType, int? referenceId, string? description, int createdBy,
        CancellationToken cancellationToken = default);
}
