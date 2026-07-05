using IslamicCompanionPro.Data.SeedData;
using IslamicCompanionPro.Models.Dto;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.Services;

/// <summary>
/// Converts Gregorian dates to the tabular ("civil") Islamic calendar using the well-known
/// Kuwaiti algorithm. This is a deterministic arithmetic calendar and can differ by a day (or
/// two) from the real, moon-sighting-based Hijri date announced by local authorities — this is
/// expected and exactly why <see cref="Models.PrayerSettings.HijriDateAdjustmentDays"/> exists:
/// let the user nudge the displayed date to match their local moon-sighting announcement.
/// </summary>
public class HijriCalendarService : IHijriCalendarService
{
	private readonly ISettingsService _settingsService;

	public HijriCalendarService(ISettingsService settingsService)
	{
		_settingsService = settingsService;
	}

	public async Task<HijriDate> ToHijriAsync(DateTime gregorianDate)
	{
		var settings = await _settingsService.GetPrayerSettingsAsync();
		return ToHijri(gregorianDate, settings.HijriDateAdjustmentDays);
	}

	public HijriDate ToHijri(DateTime gregorianDate, int adjustmentDays = 0)
	{
		long jd = GregorianToJulianDayNumber(gregorianDate.Year, gregorianDate.Month, gregorianDate.Day) + adjustmentDays;

		long l = jd - 1948440 + 10632;
		long n = (l - 1) / 10631;
		l = l - 10631 * n + 354;
		long j = ((10985 - l) / 5316) * ((50 * l) / 17719) + (l / 5670) * ((43 * l) / 15238);
		l = l - ((30 - j) / 15) * ((17719 * j) / 50) - (j / 16) * ((15238 * j) / 43) + 29;
		long month = (24 * l) / 709;
		long day = l - (709 * month) / 24;
		long year = 30 * n + j - 30;

		return new HijriDate { Year = (int)year, Month = (int)month, Day = (int)day };
	}

	public async Task<List<(IslamicEvent Event, DateTime NextGregorianDate)>> GetUpcomingEventsAsync()
	{
		var settings = await _settingsService.GetPrayerSettingsAsync();
		var results = new List<(IslamicEvent, DateTime)>();

		foreach (var evt in IslamicEventSeedData.All)
		{
			// Walk forward day-by-day (max ~1 lunar year) to find the next Gregorian date whose
			// Hijri month/day matches this event. Deliberately simple and robust rather than using
			// a reverse Hijri->Gregorian formula, which is far more error-prone to hand-derive.
			var cursor = DateTime.Today;
			DateTime? found = null;
			for (int i = 0; i < 355; i++)
			{
				var hijri = ToHijri(cursor, settings.HijriDateAdjustmentDays);
				if (hijri.Month == evt.HijriMonth && hijri.Day == evt.HijriDay)
				{
					found = cursor;
					break;
				}
				cursor = cursor.AddDays(1);
			}

			if (found.HasValue)
			{
				results.Add((evt, found.Value));
			}
		}

		return results.OrderBy(r => r.Item2).ToList();
	}

	private static long GregorianToJulianDayNumber(int year, int month, int day)
	{
		long a = (14 - month) / 12;
		long y = year + 4800 - a;
		long m = month + 12 * a - 3;
		return day + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045;
	}
}
