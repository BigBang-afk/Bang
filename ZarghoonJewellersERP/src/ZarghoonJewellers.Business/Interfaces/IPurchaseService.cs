using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

public interface IPurchaseService
{
    /// <summary>Persists a purchase, creates new stock rows for brand-new items (or increments quantity
    /// for existing ones), updates the supplier's running balance, and posts a cash ledger entry for any
    /// amount paid at the time of purchase.</summary>
    Task<PurchaseResultDto> CreatePurchaseAsync(CreatePurchaseRequest request, CancellationToken cancellationToken = default);

    Task<Purchase?> GetWithDetailsAsync(int purchaseId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Purchase>> GetRecentAsync(int count, CancellationToken cancellationToken = default);
}
