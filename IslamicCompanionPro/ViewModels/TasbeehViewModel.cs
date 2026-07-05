using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IslamicCompanionPro.Models;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.ViewModels;

public partial class TasbeehViewModel : BaseViewModel, IAppearingViewModel
{
	private readonly ISQLiteDatabaseService _db;
	private readonly ISettingsService _settingsService;

	public ObservableCollection<TasbeehRecord> TodaysZikr { get; } = new();

	[ObservableProperty]
	private TasbeehRecord? selectedZikr;

	[ObservableProperty]
	private bool vibrationEnabled = true;

	[ObservableProperty]
	private bool soundEnabled;

	[ObservableProperty]
	private string newCustomZikrName = string.Empty;

	public TasbeehViewModel(ISQLiteDatabaseService db, ISettingsService settingsService)
	{
		_db = db;
		_settingsService = settingsService;
		Title = "Tasbeeh Counter";
	}

	[RelayCommand]
	private async Task AppearingAsync()
	{
		await _db.InitializeAsync();

		var appSettings = await _settingsService.GetAppSettingsAsync();
		VibrationEnabled = appSettings.TasbeehVibrationEnabled;
		SoundEnabled = appSettings.TasbeehSoundEnabled;

		var today = await _db.Connection.Table<TasbeehRecord>()
			.Where(r => r.Date == DateTime.Today)
			.ToListAsync();

		TodaysZikr.Clear();
		foreach (var record in today)
		{
			TodaysZikr.Add(record);
		}

		SelectedZikr ??= TodaysZikr.FirstOrDefault();
	}

	[RelayCommand]
	private async Task IncrementAsync()
	{
		if (SelectedZikr is null)
		{
			return;
		}

		SelectedZikr.Count++;
		await _db.UpdateAsync(SelectedZikr);
		OnPropertyChanged(nameof(SelectedZikr));

		if (VibrationEnabled)
		{
			try { HapticFeedback.Default.Perform(HapticFeedbackType.Click); } catch (FeatureNotSupportedException) { /* device has no haptics */ }
		}

		if (SelectedZikr.Count > 0 && SelectedZikr.Count % SelectedZikr.DailyTarget == 0)
		{
			// Completed another full round of the daily target — a small vibration pulse marks it.
			if (VibrationEnabled)
			{
				try { HapticFeedback.Default.Perform(HapticFeedbackType.LongPress); } catch (FeatureNotSupportedException) { }
			}
		}
	}

	[RelayCommand]
	private async Task ResetAsync()
	{
		if (SelectedZikr is null)
		{
			return;
		}

		SelectedZikr.Count = 0;
		await _db.UpdateAsync(SelectedZikr);
		OnPropertyChanged(nameof(SelectedZikr));
	}

	[RelayCommand]
	private void SelectZikr(TasbeehRecord? record)
	{
		if (record is not null)
		{
			SelectedZikr = record;
		}
	}

	[RelayCommand]
	private async Task AddCustomZikrAsync()
	{
		if (string.IsNullOrWhiteSpace(NewCustomZikrName))
		{
			return;
		}

		var record = new TasbeehRecord
		{
			ZikrName = NewCustomZikrName.Trim(),
			Count = 0,
			DailyTarget = 33,
			Date = DateTime.Today,
			IsCustom = true
		};

		await _db.InsertAsync(record);
		TodaysZikr.Add(record);
		SelectedZikr = record;
		NewCustomZikrName = string.Empty;
	}

	partial void OnVibrationEnabledChanged(bool value) => _ = PersistTogglesAsync();
	partial void OnSoundEnabledChanged(bool value) => _ = PersistTogglesAsync();

	private async Task PersistTogglesAsync()
	{
		var appSettings = await _settingsService.GetAppSettingsAsync();
		appSettings.TasbeehVibrationEnabled = VibrationEnabled;
		appSettings.TasbeehSoundEnabled = SoundEnabled;
		await _settingsService.SaveAppSettingsAsync(appSettings);
	}
}
