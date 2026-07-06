using TradingJournal.Core.Models;

namespace TradingJournal.Core.Services;

public interface ISettingsService
{
    Task<AppSettingsEntity> GetSettingsAsync();
    Task UpdateSettingsAsync(decimal usdToPkrRate, decimal goldRatePerUnit, string goldUnitLabel);
}
