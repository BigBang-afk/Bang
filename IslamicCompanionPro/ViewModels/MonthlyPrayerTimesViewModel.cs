using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class MonthlyPrayerTimesViewModel : BaseViewModel, IAppearingViewModel
{
	private readonly IPrayerTimeService _prayerTimeService;

	public ObservableCollection<MonthlyPrayerRow> Rows { get; } = new();

	[ObservableProperty]
	private DateTime displayedMonth = new(DateTime.Today.Year, DateTime.Today.Month, 1);

	public MonthlyPrayerTimesViewModel(IPrayerTimeService prayerTimeService)
	{
		_prayerTimeService = prayerTimeService;
		Title = "Monthly Timetable";
	}

	[RelayCommand]
	private async Task AppearingAsync() => await LoadAsync();

	private async Task LoadAsync()
	{
		IsBusy = true;
		try
		{
			var results = await _prayerTimeService.GetMonthlyAsync(DisplayedMonth.Year, DisplayedMonth.Month);
			Rows.Clear();
			foreach (var day in results)
			{
				Rows.Add(new MonthlyPrayerRow
				{
					DateText = day.Date.ToString("d MMM (ddd)"),
					Fajr = day.Fajr.ToString("h:mm tt"),
					Sunrise = day.Sunrise.ToString("h:mm tt"),
					Dhuhr = day.Dhuhr.ToString("h:mm tt"),
					Asr = day.Asr.ToString("h:mm tt"),
					Maghrib = day.Maghrib.ToString("h:mm tt"),
					Isha = day.Isha.ToString("h:mm tt")
				});
			}
		}
		finally
		{
			IsBusy = false;
		}
	}

	[RelayCommand]
	private async Task PreviousMonthAsync()
	{
		DisplayedMonth = DisplayedMonth.AddMonths(-1);
		await LoadAsync();
	}

	[RelayCommand]
	private async Task NextMonthAsync()
	{
		DisplayedMonth = DisplayedMonth.AddMonths(1);
		await LoadAsync();
	}
}

public class MonthlyPrayerRow
{
	public string DateText { get; set; } = string.Empty;
	public string Fajr { get; set; } = string.Empty;
	public string Sunrise { get; set; } = string.Empty;
	public string Dhuhr { get; set; } = string.Empty;
	public string Asr { get; set; } = string.Empty;
	public string Maghrib { get; set; } = string.Empty;
	public string Isha { get; set; } = string.Empty;
}
