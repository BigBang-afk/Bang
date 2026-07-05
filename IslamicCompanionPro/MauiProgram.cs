using CommunityToolkit.Maui;
using IslamicCompanionPro.Data;
using IslamicCompanionPro.Services;
using IslamicCompanionPro.Services.Interfaces;
using IslamicCompanionPro.ViewModels;
using IslamicCompanionPro.Views;
using Microsoft.Extensions.Logging;

namespace IslamicCompanionPro;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.UseMauiCommunityToolkit()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
				fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
				// Place a Uthmani-style Arabic font (e.g. Amiri, Scheherazade New, KFGQPC Uthmanic)
				// at Resources/Fonts/Amiri-Regular.ttf for correct Quran text rendering.
				fonts.AddFont("Amiri-Regular.ttf", "Amiri");
			});

#if DEBUG
		builder.Logging.AddDebug();
#endif

		RegisterServices(builder.Services);
		RegisterViewModels(builder.Services);
		RegisterViews(builder.Services);

		return builder.Build();
	}

	private static void RegisterServices(IServiceCollection services)
	{
		services.AddSingleton<HttpClient>();

		// Single shared SQLite connection for the app's lifetime.
		services.AddSingleton<ISQLiteDatabaseService, DatabaseService>();

		services.AddSingleton<ISettingsService, SettingsService>();
		services.AddSingleton<IQuranService, QuranService>();
		services.AddSingleton<IDuaService, DuaService>();
		services.AddSingleton<IPrayerTimeService, PrayerTimeService>();
		services.AddSingleton<IQiblaService, QiblaService>();
		services.AddSingleton<IHijriCalendarService, HijriCalendarService>();
		services.AddSingleton<ILocationService, LocationService>();
		services.AddSingleton<ICompassService, CompassService>();
		services.AddSingleton<INotificationService, NotificationService>();
		services.AddSingleton<IAudioService, AudioService>();
	}

	private static void RegisterViewModels(IServiceCollection services)
	{
		services.AddTransient<SplashViewModel>();
		services.AddTransient<OnboardingViewModel>();
		services.AddTransient<HomeViewModel>();
		services.AddTransient<QuranViewModel>();
		services.AddTransient<SurahDetailViewModel>();
		services.AddTransient<DuaCategoriesViewModel>();
		services.AddTransient<DuaDetailViewModel>();
		services.AddTransient<QiblaViewModel>();
		services.AddTransient<PrayerTimesViewModel>();
		services.AddTransient<MonthlyPrayerTimesViewModel>();
		services.AddTransient<TasbeehViewModel>();
		services.AddTransient<IslamicCalendarViewModel>();
		services.AddTransient<SettingsViewModel>();
		services.AddTransient<AboutViewModel>();
	}

	private static void RegisterViews(IServiceCollection services)
	{
		services.AddTransient<SplashPage>();
		services.AddTransient<OnboardingPage>();
		services.AddTransient<HomePage>();
		services.AddTransient<QuranPage>();
		services.AddTransient<SurahDetailPage>();
		services.AddTransient<DuaCategoriesPage>();
		services.AddTransient<DuaDetailPage>();
		services.AddTransient<QiblaPage>();
		services.AddTransient<PrayerTimesPage>();
		services.AddTransient<MonthlyPrayerTimesPage>();
		services.AddTransient<TasbeehPage>();
		services.AddTransient<IslamicCalendarPage>();
		services.AddTransient<SettingsPage>();
		services.AddTransient<AboutPage>();
	}
}
