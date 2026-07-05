using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Helpers;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class OnboardingViewModel : BaseViewModel
{
	private readonly ISettingsService _settingsService;
	private readonly ILocationService _locationService;
	private readonly IAzanNotificationService _notificationService;

	[ObservableProperty]
	private int currentPageIndex;

	public OnboardingViewModel(ISettingsService settingsService, ILocationService locationService,
		IAzanNotificationService notificationService)
	{
		_settingsService = settingsService;
		_locationService = locationService;
		_notificationService = notificationService;
	}

	[RelayCommand]
	private async Task RequestPermissionsAsync()
	{
		// Ask up front, on a dedicated explanatory screen, rather than surprising the user later —
		// this is the recommended pattern for both Play Store and App Store review.
		await _locationService.RequestLocationPermissionAsync();
		await _notificationService.RequestPermissionAsync();
	}

	[RelayCommand]
	private async Task FinishAsync()
	{
		var appSettings = await _settingsService.GetAppSettingsAsync();
		appSettings.HasCompletedOnboarding = true;
		await _settingsService.SaveAppSettingsAsync(appSettings);

		await Shell.Current.GoToAsync(Routes.Home);
	}
}
