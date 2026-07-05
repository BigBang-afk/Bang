using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro;

public partial class App : Application
{
	private readonly ISettingsService _settingsService;

	public App(ISettingsService settingsService)
	{
		InitializeComponent();
		_settingsService = settingsService;

		ApplyStoredTheme();

		MainPage = new AppShell();
	}

	/// <summary>
	/// Applies the user's saved theme preference (Light/Dark/System) before the first page renders,
	/// so the app never flashes the wrong theme on launch.
	/// </summary>
	private void ApplyStoredTheme()
	{
		var theme = _settingsService.GetAppTheme();
		UserAppTheme = theme switch
		{
			Models.Enums.AppThemeMode.Light => AppTheme.Light,
			Models.Enums.AppThemeMode.Dark => AppTheme.Dark,
			_ => AppTheme.Unspecified
		};
	}

	protected override Window CreateWindow(IActivationState? activationState)
	{
		var window = base.CreateWindow(activationState);

		window.Created += (_, _) =>
		{
			// Kick off background jobs once the window is ready: reschedule today's
			// Azan notifications in case the device was rebooted or the day changed.
			MainThread.BeginInvokeOnMainThread(async () =>
			{
				var notificationService = IPlatformApplication.Current?.Services.GetService<IAzanNotificationService>();
				if (notificationService is not null)
				{
					await notificationService.RescheduleAllAsync();
				}
			});
		};

		return window;
	}
}
