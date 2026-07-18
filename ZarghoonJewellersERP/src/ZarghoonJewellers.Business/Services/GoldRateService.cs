using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class GoldRateService : IGoldRateService
{
    private readonly IUnitOfWork _unitOfWork;

    public GoldRateService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public Task<DailyGoldRate?> GetLatestAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.GoldRates.GetLatestAsync(cancellationToken);

    public async Task<DailyGoldRate> SetTodaysRateAsync(decimal rate24K, decimal rate22K, decimal rate21K, decimal rate18K,
        decimal usdPerOunce, decimal usdToPkr, int enteredBy, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var existing = await _unitOfWork.GoldRates.GetByDateAsync(today, cancellationToken);

        if (existing is not null)
        {
            existing.Rate24K = rate24K;
            existing.Rate22K = rate22K;
            existing.Rate21K = rate21K;
            existing.Rate18K = rate18K;
            existing.UsdPerOunce = usdPerOunce;
            existing.UsdToPkr = usdToPkr;
            existing.EnteredBy = enteredBy;
            _unitOfWork.GoldRates.Update(existing);
        }
        else
        {
            existing = new DailyGoldRate
            {
                RateDate = today,
                Rate24K = rate24K,
                Rate22K = rate22K,
                Rate21K = rate21K,
                Rate18K = rate18K,
                UsdPerOunce = usdPerOunce,
                UsdToPkr = usdToPkr,
                EnteredBy = enteredBy
            };
            await _unitOfWork.GoldRates.AddAsync(existing, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return existing;
    }

    public async Task<IReadOnlyList<DailyGoldRate>> GetHistoryAsync(CancellationToken cancellationToken = default)
        => (await _unitOfWork.GoldRates.FindAsync(_ => true, cancellationToken))
            .OrderByDescending(g => g.RateDate)
            .ToList();
}
