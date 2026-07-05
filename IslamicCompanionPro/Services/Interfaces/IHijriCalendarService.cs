using IslamicCompanionPro.Models.Dto;

namespace IslamicCompanionPro.Services.Interfaces;

public interface IHijriCalendarService
{
	/// <summary>Converts a Gregorian date to the Hijri (tabular/civil) calendar, applying the user's manual day adjustment.</summary>
	Task<HijriDate> ToHijriAsync(DateTime gregorianDate);

	/// <summary>Pure conversion without reading the stored adjustment offset — used by ToHijriAsync and unit tests.</summary>
	HijriDate ToHijri(DateTime gregorianDate, int adjustmentDays = 0);

	/// <summary>All known Islamic events (Ramadan, both Eids, Ashura, Laylatul Qadr, Hajj days) with their next upcoming Gregorian occurrence.</summary>
	Task<List<(IslamicEvent Event, DateTime NextGregorianDate)>> GetUpcomingEventsAsync();
}
