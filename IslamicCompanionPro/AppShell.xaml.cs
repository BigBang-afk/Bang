using IslamicCompanionPro.Views;

namespace IslamicCompanionPro;

public partial class AppShell : Shell
{
	public AppShell()
	{
		InitializeComponent();

		// Detail / modal pages are navigated to with parameters and are not part of the flyout,
		// so they are registered as routes instead of ShellContent.
		Routing.RegisterRoute(nameof(OnboardingPage), typeof(OnboardingPage));
		Routing.RegisterRoute(nameof(SurahDetailPage), typeof(SurahDetailPage));
		Routing.RegisterRoute(nameof(DuaDetailPage), typeof(DuaDetailPage));
		Routing.RegisterRoute(nameof(MonthlyPrayerTimesPage), typeof(MonthlyPrayerTimesPage));
	}
}
