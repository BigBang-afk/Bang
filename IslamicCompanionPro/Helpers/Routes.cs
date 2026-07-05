namespace IslamicCompanionPro.Helpers;

/// <summary>
/// Central place for Shell route strings so navigation calls and the routes registered in
/// AppShell.xaml / AppShell.xaml.cs never drift apart.
/// </summary>
public static class Routes
{
	// Top-level FlyoutItem routes (declared as ShellContent Route="..." in AppShell.xaml)
	public const string Home = "//home";
	public const string Quran = "//quran";
	public const string DuaCategories = "//duacategories";
	public const string Qibla = "//qibla";
	public const string PrayerTimes = "//prayertimes";
	public const string IslamicCalendar = "//islamiccalendar";
	public const string Tasbeeh = "//tasbeeh";
	public const string Settings = "//settings";
	public const string About = "//about";

	// Detail/modal routes (registered via Routing.RegisterRoute in AppShell.xaml.cs)
	public const string Onboarding = nameof(Views.OnboardingPage);
	public const string SurahDetail = nameof(Views.SurahDetailPage);
	public const string DuaDetail = nameof(Views.DuaDetailPage);
	public const string MonthlyPrayerTimes = nameof(Views.MonthlyPrayerTimesPage);
}
