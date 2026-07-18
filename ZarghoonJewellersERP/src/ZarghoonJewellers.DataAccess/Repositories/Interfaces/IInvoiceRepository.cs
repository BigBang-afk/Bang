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
}
