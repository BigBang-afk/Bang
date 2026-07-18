using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

public interface IGoldRateService
{
    Task<DailyGoldRate?> GetLatestAsync(CancellationToken cancellationToken = default);

    /// <summary>Creates today's rate row if missing, or updates it in place if already entered
    /// (only one rate is kept per calendar day).</summary>
    Task<DailyGoldRate> SetTodaysRateAsync(decimal rate24K, decimal rate22K, decimal rate21K, decimal rate18K,
        decimal usdPerOunce, decimal usdToPkr, int enteredBy, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DailyGoldRate>> GetHistoryAsync(CancellationToken cancellationToken = default);
}
