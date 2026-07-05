using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Models;
using IslamicCompanionPro.Models.Enums;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class HomeViewModel : BaseViewModel, IAppearingViewModel, IDisposable
{
	private readonly IPrayerTimeService _prayerTimeService;
	private readonly IHijriCalendarService _hijriCalendarService;
	private readonly IQuranService _quranService;
	private readonly IDuaService _duaService;
	private IDispatcherTimer? _countdownTimer;

	public string HijriDateText { get; private set; } = string.Empty;
	public string GregorianDateText { get; private set; } = DateTime.Today.ToString("dddd, d MMMM yyyy");
	public string NextPrayerName { get; private set; } = string.Empty;
	public string NextPrayerCountdown { get; private set; } = string.Empty;
	public string FajrText { get; private set; } = "--:--";
	public string SunriseText { get; private set; } = "--:--";
	public string DhuhrText { get; private set; } = "--:--";
	public string AsrText { get; private set; } = "--:--";
	public string MaghribText { get; private set; } = "--:--";
	public string IshaText { get; private set; } = "--:--";
	public string DailyAyahArabic { get; private set; } = string.Empty;
	public string DailyAyahTranslation { get; private set; } = string.Empty;
	public string DailyDuaTitle { get; private set; } = string.Empty;
	public string DailyDuaArabic { get; private set; } = string.Empty;

	private DateTime _nextPrayerTime;

	public HomeViewModel(IPrayerTimeService prayerTimeService, IHijriCalendarService hijriCalendarService,
		IQuranService quranService, IDuaService duaService)
	{
		_prayerTimeService = prayerTimeService;
		_hijriCalendarService = hijriCalendarService;
		_quranService = quranService;
		_duaService = duaService;
		Title = "Islamic Companion Pro";
	}

	[RelayCommand]
	private async Task AppearingAsync()
	{
		if (IsBusy)
		{
			return;
		}

		IsBusy = true;
		try
		{
			var hijri = await _hijriCalendarService.ToHijriAsync(DateTime.Today);
			HijriDateText = hijri.ToString();
			OnPropertyChanged(nameof(HijriDateText));

			var today = await _prayerTimeService.GetTodayAsync();
			FajrText = today.Fajr.ToString("h:mm tt");
			SunriseText = today.Sunrise.ToString("h:mm tt");
			DhuhrText = today.Dhuhr.ToString("h:mm tt");
			AsrText = today.Asr.ToString("h:mm tt");
			MaghribText = today.Maghrib.ToString("h:mm tt");
			IshaText = today.Isha.ToString("h:mm tt");
			OnPropertyChanged(nameof(FajrText));
			OnPropertyChanged(nameof(SunriseText));
			OnPropertyChanged(nameof(DhuhrText));
			OnPropertyChanged(nameof(AsrText));
			OnPropertyChanged(nameof(MaghribText));
			OnPropertyChanged(nameof(IshaText));

			var (name, time) = await _prayerTimeService.GetNextPrayerAsync(DateTime.UtcNow);
			NextPrayerName = name.ToString();
			_nextPrayerTime = time;
			OnPropertyChanged(nameof(NextPrayerName));

			await LoadDailyContentAsync();

			StartCountdownTimer();
		}
		finally
		{
			IsBusy = false;
		}
	}

	private async Task LoadDailyContentAsync()
	{
		// Deterministic "ayah/dua of the day" derived from the day of year so it rotates daily
		// without any network call, using whatever Ayahs/Duas are currently in the local database.
		var surahs = await _quranService.GetSurahsAsync();
		if (surahs.Count > 0)
		{
			var ayahs = await _quranService.GetAyahsBySurahAsync(surahs[0].SurahNumber);
			if (ayahs.Count > 0)
			{
				var ayah = ayahs[DateTime.Today.DayOfYear % ayahs.Count];
				DailyAyahArabic = ayah.TextArabic;
				DailyAyahTranslation = await _quranService.GetTranslationAsync(ayah.GlobalAyahNumber, "en") ?? string.Empty;
				OnPropertyChanged(nameof(DailyAyahArabic));
				OnPropertyChanged(nameof(DailyAyahTranslation));
			}
		}

		var categories = await _duaService.GetCategoriesAsync();
		if (categories.Count > 0)
		{
			var category = categories[DateTime.Today.DayOfYear % categories.Count];
			var duas = await _duaService.GetDuasByCategoryAsync(category.Id);
			if (duas.Count > 0)
			{
				DailyDuaTitle = duas[0].Title;
				DailyDuaArabic = duas[0].TextArabic;
				OnPropertyChanged(nameof(DailyDuaTitle));
				OnPropertyChanged(nameof(DailyDuaArabic));
			}
		}
	}

	private void StartCountdownTimer()
	{
		_countdownTimer ??= Application.Current!.Dispatcher.CreateTimer();
		_countdownTimer.Interval = TimeSpan.FromSeconds(1);
		_countdownTimer.IsRepeating = true;
		_countdownTimer.Tick -= OnCountdownTick;
		_countdownTimer.Tick += OnCountdownTick;
		_countdownTimer.Start();
		OnCountdownTick(this, EventArgs.Empty);
	}

	private void OnCountdownTick(object? sender, EventArgs e)
	{
		var remaining = _nextPrayerTime - DateTime.Now;
		NextPrayerCountdown = remaining > TimeSpan.Zero
			? remaining.ToString(@"hh\:mm\:ss")
			: "00:00:00";
		OnPropertyChanged(nameof(NextPrayerCountdown));
	}

	[RelayCommand]
	private Task GoToQuranAsync() => Shell.Current.GoToAsync(Helpers.Routes.Quran);

	[RelayCommand]
	private Task GoToDuaAsync() => Shell.Current.GoToAsync(Helpers.Routes.DuaCategories);

	[RelayCommand]
	private Task GoToQiblaAsync() => Shell.Current.GoToAsync(Helpers.Routes.Qibla);

	[RelayCommand]
	private Task GoToTasbeehAsync() => Shell.Current.GoToAsync(Helpers.Routes.Tasbeeh);

	[RelayCommand]
	private Task GoToPrayerTimesAsync() => Shell.Current.GoToAsync(Helpers.Routes.PrayerTimes);

	public void Dispose()
	{
		if (_countdownTimer is not null)
		{
			_countdownTimer.Stop();
			_countdownTimer.Tick -= OnCountdownTick;
		}
	}
}
