using IslamicCompanionPro.Models;
using IslamicCompanionPro.Models.Dto;
using IslamicCompanionPro.Models.Enums;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.Services;

/// <summary>
/// Computes Fajr/Sunrise/Dhuhr/Asr/Maghrib/Isha from first astronomical principles (solar
/// declination + equation of time derived from the Julian date), the same approach used by
/// praytimes.org and most Azan apps. This intentionally does NOT rely on timezone alone:
/// every call takes latitude, longitude, the calendar date AND a calculation method/Asr
/// convention together, exactly as required for accurate results (a fixed timezone offset by
/// itself cannot account for a location's true solar position).
/// </summary>
public class PrayerTimeService : IPrayerTimeService
{
	private readonly ISQLiteDatabaseService _db;
	private readonly ISettingsService _settingsService;

	private const double KaabaLatitude = 21.4225;
	private const double KaabaLongitude = 39.8262;

	public PrayerTimeService(ISQLiteDatabaseService db, ISettingsService settingsService)
	{
		_db = db;
		_settingsService = settingsService;
	}

	public PrayerTimesResult Calculate(DateTime date, PrayerSettings settings)
	{
		var (fajrAngle, ishaAngle, ishaMinutesAfterMaghrib) = GetMethodAngles(settings);
		double asrFactor = settings.AsrMethod == AsrMethod.Hanafi ? 2.0 : 1.0;

		var calc = new SolarCalculator(settings.Latitude, settings.Longitude, date);

		// Two passes: first with standard initial guesses, second using pass-1 results as
		// refined time-of-day estimates for the solar position — this is what gives the
		// praytimes.org-style algorithm its accuracy without needing minute-by-minute iteration.
		var approx = new DayFractions();
		for (int pass = 0; pass < 2; pass++)
		{
			approx = new DayFractions
			{
				Fajr = calc.SunAngleTime(fajrAngle, approx.Fajr, beforeNoon: true),
				Sunrise = calc.SunAngleTime(0.833, approx.Sunrise, beforeNoon: true),
				Dhuhr = calc.MidDay(approx.Dhuhr),
				Asr = calc.AsrTime(asrFactor, approx.Asr),
				Maghrib = calc.SunAngleTime(0.833, approx.Maghrib, beforeNoon: false),
				Isha = ishaMinutesAfterMaghrib > 0
					? 0 // computed below from Maghrib once we exit the loop
					: calc.SunAngleTime(ishaAngle, approx.Isha, beforeNoon: false)
			};
		}

		double timeZoneOffsetHours = GetUtcOffsetHours(settings.TimeZoneId, date);
		double longitudeCorrectionHours = settings.Longitude / 15.0;

		DateTime ToLocal(double dayFractionHours)
		{
			double localHours = dayFractionHours + timeZoneOffsetHours - longitudeCorrectionHours;
			var result = date.Date.AddHours(localHours);
			return result;
		}

		var maghrib = ToLocal(approx.Maghrib);
		var isha = ishaMinutesAfterMaghrib > 0
			? maghrib.AddMinutes(ishaMinutesAfterMaghrib)
			: ToLocal(approx.Isha);

		return new PrayerTimesResult
		{
			Date = date.Date,
			Fajr = ToLocal(approx.Fajr),
			Sunrise = ToLocal(approx.Sunrise),
			Dhuhr = ToLocal(approx.Dhuhr),
			Asr = ToLocal(approx.Asr),
			Maghrib = maghrib,
			Isha = isha
		};
	}

	public async Task<PrayerTimesResult> GetTodayAsync() => await GetForDateAsync(DateTime.Today);

	public async Task<PrayerTimesResult> GetForDateAsync(DateTime date)
	{
		var settings = await _settingsService.GetPrayerSettingsAsync();
		string hash = ComputeSettingsHash(settings);

		var cached = await _db.Connection.Table<PrayerTimesCache>()
			.Where(c => c.Date == date.Date)
			.FirstOrDefaultAsync();

		if (cached is not null && cached.SettingsHash == hash)
		{
			return FromCache(cached, settings.TimeZoneId);
		}

		var result = Calculate(date, settings);

		var row = cached ?? new PrayerTimesCache { Date = date.Date };
		row.FajrUtc = ToUtc(result.Fajr, settings.TimeZoneId);
		row.SunriseUtc = ToUtc(result.Sunrise, settings.TimeZoneId);
		row.DhuhrUtc = ToUtc(result.Dhuhr, settings.TimeZoneId);
		row.AsrUtc = ToUtc(result.Asr, settings.TimeZoneId);
		row.MaghribUtc = ToUtc(result.Maghrib, settings.TimeZoneId);
		row.IshaUtc = ToUtc(result.Isha, settings.TimeZoneId);
		row.SettingsHash = hash;

		if (cached is null)
		{
			await _db.InsertAsync(row);
		}
		else
		{
			await _db.UpdateAsync(row);
		}

		return result;
	}

	public async Task<List<PrayerTimesResult>> GetMonthlyAsync(int year, int month)
	{
		int daysInMonth = DateTime.DaysInMonth(year, month);
		var results = new List<PrayerTimesResult>(daysInMonth);
		for (int day = 1; day <= daysInMonth; day++)
		{
			results.Add(await GetForDateAsync(new DateTime(year, month, day)));
		}
		return results;
	}

	public async Task<(PrayerName Name, DateTime Time)> GetNextPrayerAsync(DateTime nowUtc)
	{
		var settings = await _settingsService.GetPrayerSettingsAsync();
		DateTime nowLocal;
		try
		{
			var tz = TimeZoneInfo.FindSystemTimeZoneById(settings.TimeZoneId);
			nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc), tz);
		}
		catch (TimeZoneNotFoundException) { nowLocal = nowUtc; }
		catch (InvalidTimeZoneException) { nowLocal = nowUtc; }

		var today = await GetForDateAsync(nowLocal.Date);
		foreach (var (name, time) in today.AsOrderedList())
		{
			if (name == PrayerName.Sunrise)
			{
				continue; // Sunrise is informational, not a prayer to count down to
			}

			if (time > nowLocal)
			{
				return (name, time);
			}
		}

		// All of today's prayers have passed — the next prayer is tomorrow's Fajr
		var tomorrow = await GetForDateAsync(nowLocal.Date.AddDays(1));
		return (PrayerName.Fajr, tomorrow.Fajr);
	}

	public async Task InvalidateCacheAsync()
	{
		await _db.Connection.ExecuteAsync("DELETE FROM PrayerTimesCache");
	}

	public async Task<(DateTime Sehri, DateTime Iftar)> GetRamadanTimingsAsync(DateTime date)
	{
		var times = await GetForDateAsync(date);
		return (times.Fajr, times.Maghrib);
	}

	private static PrayerTimesResult FromCache(PrayerTimesCache cache, string timeZoneId)
	{
		DateTime Convert(DateTime utcValue)
		{
			var utc = DateTime.SpecifyKind(utcValue, DateTimeKind.Utc);
			try
			{
				var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
				return TimeZoneInfo.ConvertTimeFromUtc(utc, tz);
			}
			catch (TimeZoneNotFoundException) { return utc; }
			catch (InvalidTimeZoneException) { return utc; }
		}

		return new PrayerTimesResult
		{
			Date = cache.Date,
			Fajr = Convert(cache.FajrUtc),
			Sunrise = Convert(cache.SunriseUtc),
			Dhuhr = Convert(cache.DhuhrUtc),
			Asr = Convert(cache.AsrUtc),
			Maghrib = Convert(cache.MaghribUtc),
			Isha = Convert(cache.IshaUtc)
		};
	}

	private static DateTime ToUtc(DateTime localApparent, string timeZoneId)
	{
		// The DateTime produced by Calculate() is already expressed in the target timezone's
		// wall-clock time (via the offset applied in ToLocal), so we just need to tag it as UTC
		// after subtracting that same offset.
		double offset = GetUtcOffsetHours(timeZoneId, localApparent);
		return DateTime.SpecifyKind(localApparent.AddHours(-offset), DateTimeKind.Utc);
	}

	private static double GetUtcOffsetHours(string timeZoneId, DateTime date)
	{
		try
		{
			var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
			return tz.GetUtcOffset(date).TotalHours;
		}
		catch (TimeZoneNotFoundException)
		{
			return 0;
		}
		catch (InvalidTimeZoneException)
		{
			return 0;
		}
	}

	private static string ComputeSettingsHash(PrayerSettings s) =>
		$"{s.Latitude:F6}|{s.Longitude:F6}|{s.CalculationMethod}|{s.AsrMethod}|{s.TimeZoneId}|{s.CustomFajrAngle}|{s.CustomIshaAngle}|{s.CustomIshaMinutesAfterMaghrib}";

	/// <summary>Fajr/Isha sun angles (degrees below horizon) or fixed minute offset for each supported convention.</summary>
	private static (double FajrAngle, double IshaAngle, int IshaMinutesAfterMaghrib) GetMethodAngles(PrayerSettings s) => s.CalculationMethod switch
	{
		CalculationMethod.MuslimWorldLeague => (18.0, 17.0, 0),
		CalculationMethod.IslamicSocietyOfNorthAmerica => (15.0, 15.0, 0),
		CalculationMethod.Egyptian => (19.5, 17.5, 0),
		CalculationMethod.UmmAlQura => (18.5, 0, 90),
		CalculationMethod.Karachi => (18.0, 18.0, 0),
		CalculationMethod.Custom => (s.CustomFajrAngle, s.CustomIshaAngle, s.CustomIshaMinutesAfterMaghrib),
		_ => (18.0, 17.0, 0)
	};

	private struct DayFractions
	{
		public double Fajr = 5.0, Sunrise = 6.0, Dhuhr = 12.0, Asr = 13.0, Maghrib = 18.0, Isha = 18.0;
		public DayFractions() { }
	}

	/// <summary>Low-level solar position math (declination, equation of time) and hour-angle solving.</summary>
	private class SolarCalculator
	{
		private readonly double _lat;
		private readonly double _jd;

		public SolarCalculator(double latitude, double longitude, DateTime date)
		{
			_lat = latitude;
			_jd = JulianDate(date.Year, date.Month, date.Day) - longitude / (15.0 * 24.0);
		}

		public double MidDay(double timeOfDayHours)
		{
			double eqt = SunPosition(_jd + timeOfDayHours).EquationOfTimeHours;
			return FixHour(12.0 - eqt);
		}

		public double SunAngleTime(double angleDegrees, double timeOfDayHours, bool beforeNoon)
		{
			var pos = SunPosition(_jd + timeOfDayHours);
			double noon = MidDay(timeOfDayHours);

			double cosArg = (-Sin(angleDegrees) - Sin(pos.DeclinationDegrees) * Sin(_lat)) /
							(Cos(pos.DeclinationDegrees) * Cos(_lat));
			cosArg = Math.Clamp(cosArg, -1.0, 1.0);

			double t = RadToDeg(Math.Acos(cosArg)) / 15.0;
			return beforeNoon ? noon - t : noon + t;
		}

		public double AsrTime(double shadowFactor, double timeOfDayHours)
		{
			var pos = SunPosition(_jd + timeOfDayHours);
			double angle = -RadToDeg(Math.Atan(1.0 / (shadowFactor + Math.Tan(DegToRad(Math.Abs(_lat - pos.DeclinationDegrees))))));
			return SunAngleTime(angle, timeOfDayHours, beforeNoon: false);
		}

		private static (double DeclinationDegrees, double EquationOfTimeHours) SunPosition(double jd)
		{
			double d = jd - 2451545.0;
			double g = FixAngle(357.529 + 0.98560028 * d);
			double q = FixAngle(280.459 + 0.98564736 * d);
			double l = FixAngle(q + 1.915 * Sin(g) + 0.020 * Sin(2 * g));

			double e = 23.439 - 0.00000036 * d;

			double ra = RadToDeg(Math.Atan2(Cos(e) * Sin(l), Cos(l))) / 15.0;
			ra = FixHour(ra);

			double eqt = q / 15.0 - ra;
			double decl = RadToDeg(Math.Asin(Sin(e) * Sin(l)));

			return (decl, eqt);
		}

		private static double JulianDate(int year, int month, int day)
		{
			if (month <= 2)
			{
				year -= 1;
				month += 12;
			}
			double a = Math.Floor(year / 100.0);
			double b = 2 - a + Math.Floor(a / 4.0);
			return Math.Floor(365.25 * (year + 4716)) + Math.Floor(30.6001 * (month + 1)) + day + b - 1524.5;
		}

		private static double Sin(double deg) => Math.Sin(DegToRad(deg));
		private static double Cos(double deg) => Math.Cos(DegToRad(deg));
		private static double DegToRad(double deg) => deg * Math.PI / 180.0;
		private static double RadToDeg(double rad) => rad * 180.0 / Math.PI;

		private static double FixAngle(double angle) => Fix(angle, 360.0);
		private static double FixHour(double hour) => Fix(hour, 24.0);

		private static double Fix(double value, double mod)
		{
			value -= mod * Math.Floor(value / mod);
			return value < 0 ? value + mod : value;
		}
	}
}
