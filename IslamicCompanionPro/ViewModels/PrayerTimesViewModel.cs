using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Helpers;
using IslamicCompanionPro.Models.Enums;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class PrayerTimesViewModel : BaseViewModel, IAppearingViewModel
{
	private readonly IPrayerTimeService _prayerTimeService;
	private readonly ISettingsService _settingsService;

	[ObservableProperty] private string fajrText = "--:--";
	[ObservableProperty] private string sunriseText = "--:--";
	[ObservableProperty] private string dhuhrText = "--:--";
	[ObservableProperty] private string asrText = "--:--";
	[ObservableProperty] private string maghribText = "--:--";
	[ObservableProperty] private string ishaText = "--:--";
	[ObservableProperty] private string sehriText = "--:--";
	[ObservableProperty] private string iftarText = "--:--";
	[ObservableProperty] private string nextPrayerName = string.Empty;
	[ObservableProperty] private PrayerName highlightedPrayer;
	[ObservableProperty] private bool isRamadan;

	public PrayerTimesViewModel(IPrayerTimeService prayerTimeService, ISettingsService settingsService)
	{
		_prayerTimeService = prayerTimeService;
		_settingsService = settingsService;
		Title = "Prayer Times";
	}

	[RelayCommand]
	private async Task AppearingAsync()
	{
		IsBusy = true;
		try
		{
			var today = await _prayerTimeService.GetTodayAsync();
			FajrText = today.Fajr.ToString("h:mm tt");
			SunriseText = today.Sunrise.ToString("h:mm tt");
			DhuhrText = today.Dhuhr.ToString("h:mm tt");
			AsrText = today.Asr.ToString("h:mm tt");
			MaghribText = today.Maghrib.ToString("h:mm tt");
			IshaText = today.Isha.ToString("h:mm tt");

			var (sehri, iftar) = await _prayerTimeService.GetRamadanTimingsAsync(DateTime.Today);
			SehriText = sehri.ToString("h:mm tt");
			IftarText = iftar.ToString("h:mm tt");

			var (name, _) = await _prayerTimeService.GetNextPrayerAsync(DateTime.UtcNow);
			NextPrayerName = name.ToString();
			HighlightedPrayer = name;
		}
		finally
		{
			IsBusy = false;
		}
	}

	[RelayCommand]
	private Task ViewMonthlyAsync() => Shell.Current.GoToAsync(Routes.MonthlyPrayerTimes);

	[RelayCommand]
	private Task OpenSettingsAsync() => Shell.Current.GoToAsync(Routes.Settings);
}
