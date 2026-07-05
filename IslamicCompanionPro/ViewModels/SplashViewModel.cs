using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Helpers;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class SplashViewModel : BaseViewModel, IAppearingViewModel
{
	private readonly ISQLiteDatabaseService _db;
	private readonly ISettingsService _settingsService;

	public SplashViewModel(ISQLiteDatabaseService db, ISettingsService settingsService)
	{
		_db = db;
		_settingsService = settingsService;
	}

	[RelayCommand]
	private async Task AppearingAsync()
	{
		await _db.InitializeAsync();
		var appSettings = await _settingsService.GetAppSettingsAsync();

		await Task.Delay(800); // brief brand moment; keep short so the splash never feels like a blocker

		string destination = appSettings.HasCompletedOnboarding ? Routes.Home : Routes.Onboarding;
		await Shell.Current.GoToAsync(destination);
	}
}
