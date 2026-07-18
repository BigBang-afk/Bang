using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

public interface IInvoiceService
{
    /// <summary>Persists a new sales invoice, decrements stock, updates the customer's running balance,
    /// and posts the corresponding cash/gold ledger entries - all inside a single database transaction.</summary>
    Task<InvoiceResultDto> CreateInvoiceAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default);

    Task<Invoice?> GetWithDetailsAsync(int invoiceId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Invoice>> GetRecentAsync(int count, CancellationToken cancellationToken = default);

    /// <summary>Marks the invoice Cancelled and reverses the stock decrement + customer balance impact.</summary>
    Task CancelInvoiceAsync(int invoiceId, CancellationToken cancellationToken = default);
}
