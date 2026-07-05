using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Models.Enums;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class SettingsViewModel : BaseViewModel, IAppearingViewModel
{
	private readonly ISettingsService _settingsService;
	private readonly ILocationService _locationService;
	private readonly IPrayerTimeService _prayerTimeService;
	private readonly INotificationService _notificationService;

	// --- App settings ---
	[ObservableProperty] private AppLanguage language;
	[ObservableProperty] private AppTheme theme;
	[ObservableProperty] private double quranFontSize;
	[ObservableProperty] private double duaFontSize;

	// --- Prayer settings ---
	[ObservableProperty] private LocationMode locationMode;
	[ObservableProperty] private string cityName = string.Empty;
	[ObservableProperty] private string countryName = string.Empty;
	[ObservableProperty] private double manualLatitude;
	[ObservableProperty] private double manualLongitude;
	[ObservableProperty] private string selectedTimeZoneId = TimeZoneInfo.Local.Id;
	[ObservableProperty] private CalculationMethod calculationMethod;
	[ObservableProperty] private AsrMethod asrMethod;
	[ObservableProperty] private int reminderMinutesBeforePrayer;
	[ObservableProperty] private AzanSound azanSound;
	[ObservableProperty] private bool silentNotifications;
	[ObservableProperty] private bool jummahReminderEnabled;
	[ObservableProperty] private bool fajrNotificationEnabled;
	[ObservableProperty] private bool dhuhrNotificationEnabled;
	[ObservableProperty] private bool asrNotificationEnabled;
	[ObservableProperty] private bool maghribNotificationEnabled;
	[ObservableProperty] private bool ishaNotificationEnabled;

	[ObservableProperty] private string statusMessage = string.Empty;

	public List<AppLanguage> Languages { get; } = Enum.GetValues<AppLanguage>().ToList();
	public List<AppTheme> Themes { get; } = Enum.GetValues<AppTheme>().ToList();
	public List<CalculationMethod> CalculationMethods { get; } = Enum.GetValues<CalculationMethod>().ToList();
	public List<AsrMethod> AsrMethods { get; } = Enum.GetValues<AsrMethod>().ToList();
	public List<AzanSound> AzanSounds { get; } = Enum.GetValues<AzanSound>().ToList();
	public List<LocationMode> LocationModes { get; } = Enum.GetValues<LocationMode>().ToList();
	public ObservableCollection<string> TimeZoneIds { get; } = new(
		TimeZoneInfo.GetSystemTimeZones().Select(tz => tz.Id).OrderBy(id => id));

	public SettingsViewModel(ISettingsService settingsService, ILocationService locationService,
		IPrayerTimeService prayerTimeService, INotificationService notificationService)
	{
		_settingsService = settingsService;
		_locationService = locationService;
		_prayerTimeService = prayerTimeService;
		_notificationService = notificationService;
		Title = "Settings";
	}

	[RelayCommand]
	private async Task AppearingAsync()
	{
		var app = await _settingsService.GetAppSettingsAsync();
		Language = app.Language;
		Theme = app.Theme;
		QuranFontSize = app.QuranFontSize;
		DuaFontSize = app.DuaFontSize;

		var prayer = await _settingsService.GetPrayerSettingsAsync();
		LocationMode = prayer.LocationMode;
		CityName = prayer.CityName;
		CountryName = prayer.CountryName;
		ManualLatitude = prayer.Latitude;
		ManualLongitude = prayer.Longitude;
		SelectedTimeZoneId = string.IsNullOrEmpty(prayer.TimeZoneId) ? TimeZoneInfo.Local.Id : prayer.TimeZoneId;
		CalculationMethod = prayer.CalculationMethod;
		AsrMethod = prayer.AsrMethod;
		ReminderMinutesBeforePrayer = prayer.ReminderMinutesBeforePrayer;
		AzanSound = prayer.AzanSound;
		SilentNotifications = prayer.SilentNotifications;
		JummahReminderEnabled = prayer.JummahReminderEnabled;
		FajrNotificationEnabled = prayer.FajrNotificationEnabled;
		DhuhrNotificationEnabled = prayer.DhuhrNotificationEnabled;
		AsrNotificationEnabled = prayer.AsrNotificationEnabled;
		MaghribNotificationEnabled = prayer.MaghribNotificationEnabled;
		IshaNotificationEnabled = prayer.IshaNotificationEnabled;
	}

	[RelayCommand]
	private async Task UseCurrentLocationAsync()
	{
		var location = await _locationService.GetCurrentLocationAsync();
		if (location is null)
		{
			StatusMessage = "Could not get current location. Check GPS and location permission.";
			return;
		}

		ManualLatitude = location.Value.Latitude;
		ManualLongitude = location.Value.Longitude;
		LocationMode = LocationMode.AutomaticGps;
		StatusMessage = "Location updated from GPS.";
	}

	[RelayCommand]
	private async Task SaveAsync()
	{
		var app = await _settingsService.GetAppSettingsAsync();
		app.Language = Language;
		app.Theme = Theme;
		app.QuranFontSize = QuranFontSize;
		app.DuaFontSize = DuaFontSize;
		await _settingsService.SaveAppSettingsAsync(app);

		Application.Current!.UserAppTheme = Theme switch
		{
			AppTheme.Light => Microsoft.Maui.ApplicationModel.AppTheme.Light,
			AppTheme.Dark => Microsoft.Maui.ApplicationModel.AppTheme.Dark,
			_ => Microsoft.Maui.ApplicationModel.AppTheme.Unspecified
		};

		var prayer = await _settingsService.GetPrayerSettingsAsync();
		prayer.LocationMode = LocationMode;
		prayer.CityName = CityName;
		prayer.CountryName = CountryName;
		prayer.Latitude = ManualLatitude;
		prayer.Longitude = ManualLongitude;
		prayer.TimeZoneId = SelectedTimeZoneId;
		prayer.CalculationMethod = CalculationMethod;
		prayer.AsrMethod = AsrMethod;
		prayer.ReminderMinutesBeforePrayer = ReminderMinutesBeforePrayer;
		prayer.AzanSound = AzanSound;
		prayer.SilentNotifications = SilentNotifications;
		prayer.JummahReminderEnabled = JummahReminderEnabled;
		prayer.FajrNotificationEnabled = FajrNotificationEnabled;
		prayer.DhuhrNotificationEnabled = DhuhrNotificationEnabled;
		prayer.AsrNotificationEnabled = AsrNotificationEnabled;
		prayer.MaghribNotificationEnabled = MaghribNotificationEnabled;
		prayer.IshaNotificationEnabled = IshaNotificationEnabled;
		await _settingsService.SavePrayerSettingsAsync(prayer);

		// Location/timezone/method changed — cached prayer times are no longer valid.
		await _prayerTimeService.InvalidateCacheAsync();
		await _notificationService.RescheduleAllAsync();

		StatusMessage = "Settings saved.";
	}

	[RelayCommand]
	private async Task SendTestNotificationAsync() => await _notificationService.ShowTestNotificationAsync();

	[RelayCommand]
	private async Task BackupDataAsync()
	{
		try
		{
			string path = await _settingsService.BackupDatabaseAsync();
			await Share.Default.RequestAsync(new ShareFileRequest
			{
				Title = "Islamic Companion Pro Backup",
				File = new ShareFile(path)
			});
			StatusMessage = "Backup created and ready to share/save.";
		}
		catch (Exception ex)
		{
			StatusMessage = $"Backup failed: {ex.Message}";
		}
	}

	[RelayCommand]
	private async Task RestoreDataAsync()
	{
		try
		{
			var pick = await FilePicker.Default.PickAsync(new PickOptions { PickerTitle = "Select backup file" });
			if (pick is null)
			{
				return;
			}

			await _settingsService.RestoreDatabaseAsync(pick.FullPath);
			await AppearingAsync();
			StatusMessage = "Backup restored successfully.";
		}
		catch (Exception ex)
		{
			StatusMessage = $"Restore failed: {ex.Message}";
		}
	}

	[RelayCommand]
	private async Task ResetAppAsync()
	{
		await _settingsService.ResetAllSettingsAsync();
		await AppearingAsync();
		StatusMessage = "App has been reset to defaults.";
	}
}
