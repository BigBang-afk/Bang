using IslamicCompanionPro.Models;
using IslamicCompanionPro.Models.Dto;
using IslamicCompanionPro.Models.Enums;

namespace IslamicCompanionPro.Services.Interfaces;

public interface IPrayerTimeService
{
	/// <summary>
	/// Pure calculation: given a date and a fully-specified settings snapshot, returns the six
	/// daily prayer times in the local time of <see cref="PrayerSettings.TimeZoneId"/>. No I/O,
	/// no caching — safe to call repeatedly (e.g. for a monthly table) and to unit test.
	/// </summary>
	PrayerTimesResult Calculate(DateTime date, PrayerSettings settings);

	/// <summary>Returns today's prayer times, using the cached value if settings haven't changed since it was computed.</summary>
	Task<PrayerTimesResult> GetTodayAsync();

	Task<PrayerTimesResult> GetForDateAsync(DateTime date);

	Task<List<PrayerTimesResult>> GetMonthlyAsync(int year, int month);

	/// <summary>
	/// Finds the next upcoming prayer relative to <paramref name="nowUtc"/> (must be UTC — e.g.
	/// DateTime.UtcNow), rolling into tomorrow's Fajr if needed. The returned Time is expressed in
	/// the configured PrayerSettings.TimeZoneId, not the device's local timezone.
	/// </summary>
	Task<(PrayerName Name, DateTime Time)> GetNextPrayerAsync(DateTime nowUtc);

	/// <summary>Invalidates the PrayerTimesCache table; call after location/timezone/method/Asr settings change.</summary>
	Task InvalidateCacheAsync();

	/// <summary>Sehri (end of pre-dawn meal = Fajr) and Iftar (= Maghrib) for the given date, for the Ramadan widget.</summary>
	Task<(DateTime Sehri, DateTime Iftar)> GetRamadanTimingsAsync(DateTime date);
}
