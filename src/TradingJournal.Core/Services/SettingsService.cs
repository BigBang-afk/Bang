using Microsoft.EntityFrameworkCore;
using TradingJournal.Core.Data;
using TradingJournal.Core.Models;

namespace TradingJournal.Core.Services;

public class SettingsService : ISettingsService
{
    private readonly JournalDbContext _db;

    public SettingsService(JournalDbContext db)
    {
        _db = db;
    }

    public async Task<AppSettingsEntity> GetSettingsAsync()
    {
        var settings = await _db.Settings.FirstOrDefaultAsync(s => s.Id == 1);
        if (settings is null)
        {
            settings = new AppSettingsEntity { Id = 1 };
            _db.Settings.Add(settings);
            await _db.SaveChangesAsync();
        }

        return settings;
    }

    public async Task UpdateSettingsAsync(decimal usdToPkrRate, decimal goldRatePerUnit, string goldUnitLabel)
    {
        if (usdToPkrRate <= 0)
            throw new ArgumentOutOfRangeException(nameof(usdToPkrRate), "USD to PKR rate must be greater than zero.");
        if (goldRatePerUnit <= 0)
            throw new ArgumentOutOfRangeException(nameof(goldRatePerUnit), "Gold rate must be greater than zero.");

        var settings = await GetSettingsAsync();
        settings.UsdToPkrRate = usdToPkrRate;
        settings.GoldRatePerUnit = goldRatePerUnit;
        settings.GoldUnitLabel = string.IsNullOrWhiteSpace(goldUnitLabel) ? settings.GoldUnitLabel : goldUnitLabel.Trim();
        settings.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
    }
}
