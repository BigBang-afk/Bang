using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GoldLedgerApp.Models;
using GoldLedgerApp.Services;

namespace GoldLedgerApp.ViewModels;

public partial class SettingsViewModel : BaseViewModel
{
	private readonly DatabaseService _db;
	private readonly SettingsService _settings;
	private readonly AuthService _auth;
	private readonly string _dbPath;

	public static readonly string[] WeightUnitOptions = { "Gram", "Tola" };

	[ObservableProperty]
	private string shopName = string.Empty;

	[ObservableProperty]
	private string currencySymbol = string.Empty;

	[ObservableProperty]
	private string selectedWeightUnit = "Gram";

	[ObservableProperty]
	private string defaultPurityText = "24";

	[ObservableProperty]
	private string currentRateText = string.Empty;

	[ObservableProperty]
	private string appVersion = AppInfo.Current.VersionString;

	public ObservableCollection<GoldRate> RateHistory { get; } = new();

	public SettingsViewModel(DatabaseService db, SettingsService settings, AuthService auth)
	{
		_db = db;
		_settings = settings;
		_auth = auth;
		_dbPath = Path.Combine(FileSystem.AppDataDirectory, "goldledger.db3");
		Title = "Settings";
	}

	[RelayCommand]
	public async Task LoadAsync()
	{
		IsBusy = true;

		ShopName = _settings.ShopName;
		CurrencySymbol = _settings.CurrencySymbol;
		SelectedWeightUnit = _settings.WeightUnit == WeightUnit.Tola ? "Tola" : "Gram";
		DefaultPurityText = _settings.DefaultPurityKarat.ToString("0.##");

		var rate = await _db.GetLatestRateAsync();
		CurrentRateText = rate?.RatePerGram24K.ToString("0.##") ?? "0";

		var history = await _db.GetRateHistoryAsync(15);
		RateHistory.Clear();
		foreach (var r in history)
			RateHistory.Add(r);

		IsBusy = false;
	}

	[RelayCommand]
	private async Task SaveProfileAsync()
	{
		var page = Shell.Current?.CurrentPage;

		_settings.ShopName = string.IsNullOrWhiteSpace(ShopName) ? _settings.ShopName : ShopName.Trim();
		_settings.CurrencySymbol = string.IsNullOrWhiteSpace(CurrencySymbol) ? _settings.CurrencySymbol : CurrencySymbol.Trim();
		_settings.WeightUnit = SelectedWeightUnit == "Tola" ? WeightUnit.Tola : WeightUnit.Gram;

		if (double.TryParse(DefaultPurityText, out var purity) && purity > 0)
			_settings.DefaultPurityKarat = purity;

		if (page is not null)
			await page.DisplayAlert("Saved", "Shop settings updated.", "OK");
	}

	[RelayCommand]
	private async Task UpdateRateAsync()
	{
		var page = Shell.Current?.CurrentPage;
		if (page is null) return;

		var input = await page.DisplayPromptAsync(
			"Update Gold Rate",
			"Enter today's rate per gram for 24K pure gold",
			accept: "Save",
			cancel: "Cancel",
			initialValue: CurrentRateText,
			keyboard: Keyboard.Numeric);

		if (string.IsNullOrWhiteSpace(input)) return;

		if (decimal.TryParse(input, out var rate) && rate > 0)
		{
			await _db.SaveRateAsync(rate);
			await LoadAsync();
		}
		else
		{
			await page.DisplayAlert("Invalid rate", "Please enter a valid positive number.", "OK");
		}
	}

	[RelayCommand]
	private async Task ChangePinAsync()
	{
		var page = Shell.Current?.CurrentPage;
		if (page is null) return;

		var current = await page.DisplayPromptAsync("Current PIN", "Enter your current 4-digit PIN",
			accept: "Next", cancel: "Cancel", maxLength: 4, keyboard: Keyboard.Numeric);
		if (string.IsNullOrWhiteSpace(current)) return;

		if (!await _auth.VerifyPinAsync(current))
		{
			await page.DisplayAlert("Incorrect PIN", "The current PIN you entered is incorrect.", "OK");
			return;
		}

		var newPin = await page.DisplayPromptAsync("New PIN", "Enter a new 4-digit PIN",
			accept: "Next", cancel: "Cancel", maxLength: 4, keyboard: Keyboard.Numeric);
		if (string.IsNullOrWhiteSpace(newPin) || newPin.Length != 4)
		{
			await page.DisplayAlert("Invalid PIN", "PIN must be exactly 4 digits.", "OK");
			return;
		}

		var confirmPin = await page.DisplayPromptAsync("Confirm PIN", "Re-enter the new PIN",
			accept: "Save", cancel: "Cancel", maxLength: 4, keyboard: Keyboard.Numeric);

		if (confirmPin != newPin)
		{
			await page.DisplayAlert("PINs didn't match", "Please try again.", "OK");
			return;
		}

		await _auth.SetPinAsync(newPin);
		await page.DisplayAlert("PIN updated", "Your PIN has been changed successfully.", "OK");
	}

	[RelayCommand]
	private async Task BackupAsync()
	{
		var page = Shell.Current?.CurrentPage;
		if (page is null) return;

		if (!File.Exists(_dbPath))
		{
			await page.DisplayAlert("No data yet", "There is no data to back up yet.", "OK");
			return;
		}

		var backupName = $"GoldLedger_Backup_{DateTime.Now:yyyyMMdd_HHmmss}.db3";
		var backupPath = Path.Combine(FileSystem.CacheDirectory, backupName);
		File.Copy(_dbPath, backupPath, overwrite: true);

		await Share.Default.RequestAsync(new ShareFileRequest
		{
			Title = "Gold Ledger Backup",
			File = new ShareFile(backupPath)
		});
	}

	[RelayCommand]
	private async Task LockAppAsync()
	{
		_auth.ClearSession();
		var confirm = await (Shell.Current?.CurrentPage?.DisplayAlert(
			"Lock App", "You'll need your PIN to open the app again.", "Lock Now", "Cancel") ?? Task.FromResult(false));

		if (confirm)
			App.ShowLogin();
	}
}
