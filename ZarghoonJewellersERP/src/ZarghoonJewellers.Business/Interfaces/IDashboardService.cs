using ZarghoonJewellers.Business.DTOs;

namespace ZarghoonJewellers.Business.Interfaces;

public interface IDashboardService
{
    /// <summary>Assembles every stat card, list and chart series the Dashboard screen needs in one call.</summary>
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
}
