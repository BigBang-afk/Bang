using IslamicCompanionPro.Models.Dto;

namespace IslamicCompanionPro.Data.SeedData;

/// <summary>Fixed Hijri-calendar dates for the major Islamic observances shown on the Islamic Calendar page.</summary>
public static class IslamicEventSeedData
{
	public static readonly IslamicEvent[] All =
	{
		new() { Name = "Start of Ramadan", HijriMonth = 9, HijriDay = 1, Description = "The beginning of the month of fasting." },
		new() { Name = "Laylatul Qadr (reminder)", HijriMonth = 9, HijriDay = 27, Description = "The Night of Decree is sought among the odd nights of the last ten nights of Ramadan (21st, 23rd, 25th, 27th, 29th)." },
		new() { Name = "Eid ul-Fitr", HijriMonth = 10, HijriDay = 1, Description = "Festival marking the end of Ramadan." },
		new() { Name = "Hajj begins", HijriMonth = 12, HijriDay = 8, Description = "Pilgrims proceed to Mina to begin the rites of Hajj." },
		new() { Name = "Day of Arafah", HijriMonth = 12, HijriDay = 9, Description = "The most important day of Hajj; a recommended fasting day for non-pilgrims." },
		new() { Name = "Eid ul-Adha", HijriMonth = 12, HijriDay = 10, Description = "Festival of Sacrifice, marking the end of Hajj." },
		new() { Name = "Ashura", HijriMonth = 1, HijriDay = 10, Description = "A recommended day of fasting, commemorating the day Allah saved Musa (AS) and his people." },
	};
}
