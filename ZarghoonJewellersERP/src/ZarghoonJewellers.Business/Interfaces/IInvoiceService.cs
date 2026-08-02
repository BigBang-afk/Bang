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

    /// <summary>Saves the current POS cart as a Held invoice (Status="Held") with no stock/ledger impact
    /// yet, so the cashier can serve another customer and come back to it later via Recall.</summary>
    Task<InvoiceResultDto> HoldInvoiceAsync(CreateInvoiceRequest request, string holdLabel, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Invoice>> GetHeldInvoicesAsync(CancellationToken cancellationToken = default);

    /// <summary>Deletes a held invoice outright (no stock/ledger reversal needed since none was ever applied).</summary>
    Task DeleteHeldInvoiceAsync(int invoiceId, CancellationToken cancellationToken = default);

    /// <summary>Finalizes a previously-held invoice exactly like <see cref="CreateInvoiceAsync"/> would for a
    /// brand-new one (stock decrement, ledger postings, Status becomes Confirmed) - the held row is reused
    /// rather than creating a second invoice.</summary>
    Task<InvoiceResultDto> CompleteHeldInvoiceAsync(int invoiceId, CreateInvoiceRequest request, CancellationToken cancellationToken = default);

    /// <summary>Processes a return and/or exchange against a previously confirmed sale: restocks the
    /// returned lines, refunds/adjusts the customer's balance, and - if new lines are included - sells
    /// the replacement items in the same transaction.</summary>
    Task<ReturnResultDto> ProcessReturnAsync(ProcessReturnRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Invoice>> SearchInvoicesAsync(string? searchTerm, DateOnly? fromDate, DateOnly? toDate,
        string? status, int? customerId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Invoice>> GetByShiftAsync(int shiftId, CancellationToken cancellationToken = default);
}
