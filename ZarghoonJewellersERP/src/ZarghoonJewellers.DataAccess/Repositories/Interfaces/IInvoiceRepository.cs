using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

public interface IInvoiceRepository : IGenericRepository<Invoice>
{
    Task<string> GenerateNextInvoiceNumberAsync(CancellationToken cancellationToken = default);
    Task<Invoice?> GetWithDetailsAsync(int invoiceId, CancellationToken cancellationToken = default);
    Task<decimal> GetTotalSalesForDateAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Invoice>> GetRecentAsync(int count, CancellationToken cancellationToken = default);

    /// <summary>Daily totals for the trailing <paramref name="days"/> days (inclusive of today) - feeds the profit graph.</summary>
    Task<IReadOnlyList<(DateOnly Date, decimal TotalSales)>> GetDailySalesTotalsAsync(int days, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Invoice>> GetHeldInvoicesAsync(CancellationToken cancellationToken = default);

    /// <summary>Full-text-ish search across invoice #, customer name and status/type, newest first, for
    /// the Invoice History / Search screen.</summary>
    Task<IReadOnlyList<Invoice>> SearchInvoicesAsync(string? searchTerm, DateOnly? fromDate, DateOnly? toDate,
        string? status, int? customerId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Invoice>> GetByShiftAsync(int shiftId, CancellationToken cancellationToken = default);
}
