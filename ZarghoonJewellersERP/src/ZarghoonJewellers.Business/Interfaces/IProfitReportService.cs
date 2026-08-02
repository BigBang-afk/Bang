using ZarghoonJewellers.Business.DTOs;

namespace ZarghoonJewellers.Business.Interfaces;

/// <summary>Profit breakdowns for the Sales/Accounting reporting screens. Cost is always derived
/// from Stock.PurchaseRate at the time of reporting (the same approximation the Dashboard uses),
/// since there is no separate manufacturing-cost ledger in this model.</summary>
public interface IProfitReportService
{
    Task<IReadOnlyList<ProfitByItemDto>> GetProfitByItemAsync(DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProfitByCategoryDto>> GetProfitByCategoryAsync(DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProfitByEmployeeDto>> GetProfitByEmployeeAsync(DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProfitPeriodPointDto>> GetProfitOverTimeAsync(ProfitPeriod period, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default);
}
