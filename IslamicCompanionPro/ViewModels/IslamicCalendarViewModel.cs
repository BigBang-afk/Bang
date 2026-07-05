using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Models.Dto;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class IslamicCalendarViewModel : BaseViewModel, IAppearingViewModel
{
	private readonly IHijriCalendarService _hijriCalendarService;
	private readonly ISettingsService _settingsService;

	[ObservableProperty]
	private string hijriDateText = string.Empty;

	[ObservableProperty]
	private string gregorianDateText = DateTime.Today.ToString("dddd, d MMMM yyyy");

	[ObservableProperty]
	private int adjustmentDays;

	public ObservableCollection<UpcomingEventItem> UpcomingEvents { get; } = new();

	public IslamicCalendarViewModel(IHijriCalendarService hijriCalendarService, ISettingsService settingsService)
	{
		_hijriCalendarService = hijriCalendarService;
		_settingsService = settingsService;
		Title = "Islamic Calendar";
	}

	[RelayCommand]
	private async Task AppearingAsync()
	{
		IsBusy = true;
		try
		{
			var settings = await _settingsService.GetPrayerSettingsAsync();
			AdjustmentDays = settings.HijriDateAdjustmentDays;

			var today = await _hijriCalendarService.ToHijriAsync(DateTime.Today);
			HijriDateText = today.ToString();

			var events = await _hijriCalendarService.GetUpcomingEventsAsync();
			UpcomingEvents.Clear();
			foreach (var (evt, date) in events)
			{
				UpcomingEvents.Add(new UpcomingEventItem
				{
					Name = evt.Name,
					Description = evt.Description,
					DateText = date.ToString("d MMMM yyyy"),
					DaysAway = (date - DateTime.Today).Days
				});
			}
		}
		finally
		{
			IsBusy = false;
		}
	}

	[RelayCommand]
	private async Task IncreaseAdjustmentAsync() => await SetAdjustmentAsync(AdjustmentDays + 1);

	[RelayCommand]
	private async Task DecreaseAdjustmentAsync() => await SetAdjustmentAsync(AdjustmentDays - 1);

	private async Task SetAdjustmentAsync(int days)
	{
		AdjustmentDays = Math.Clamp(days, -2, 2);
		var settings = await _settingsService.GetPrayerSettingsAsync();
		settings.HijriDateAdjustmentDays = AdjustmentDays;
		await _settingsService.SavePrayerSettingsAsync(settings);
		await AppearingAsync();
	}
}

public class UpcomingEventItem
{
	public string Name { get; set; } = string.Empty;
	public string Description { get; set; } = string.Empty;
	public string DateText { get; set; } = string.Empty;
	public int DaysAway { get; set; }
}
