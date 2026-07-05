using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GoldLedgerApp.Models;
using GoldLedgerApp.Services;

namespace GoldLedgerApp.ViewModels;

public partial class DashboardViewModel : BaseViewModel
{
	private readonly DatabaseService _db;
	private readonly SettingsService _settings;

	[ObservableProperty]
	private string shopName = string.Empty;

	[ObservableProperty]
	private string todayDateText = string.Empty;

	[ObservableProperty]
	private decimal currentRate;

	[ObservableProperty]
	private string formattedRate = string.Empty;

	[ObservableProperty]
	private string todayBuyText = string.Empty;

	[ObservableProperty]
	private string todaySellText = string.Empty;

	[ObservableProperty]
	private string outstandingText = string.Empty;

	[ObservableProperty]
	private int buyCountToday;

	[ObservableProperty]
	private int sellCountToday;

	[ObservableProperty]
	private bool hasNoTransactions;

	public ObservableCollection<GoldTransaction> RecentTransactions { get; } = new();

	public DashboardViewModel(DatabaseService db, SettingsService settings)
	{
		_db = db;
		_settings = settings;
		Title = "Dashboard";
	}

	[RelayCommand]
	public async Task LoadAsync()
	{
		IsBusy = true;

		ShopName = _settings.ShopName;
		TodayDateText = DateTime.Now.ToString("dddd, dd MMM yyyy");

		var rate = await _db.GetLatestRateAsync();
		CurrentRate = rate?.RatePerGram24K ?? 0;
		FormattedRate = CurrentRate > 0
			? $"{_settings.FormatAmount(CurrentRate)} / g (24K)"
			: "Tap to set today's rate";

		var today = DateTime.Today;
		var (totalBuy, totalSell, buyCount, sellCount) = await _db.GetSummaryAsync(today, today);
		TodayBuyText = _settings.FormatAmount(totalBuy);
		TodaySellText = _settings.FormatAmount(totalSell);
		BuyCountToday = buyCount;
		SellCountToday = sellCount;

		var outstanding = await _db.GetTotalOutstandingAsync();
		OutstandingText = _settings.FormatAmount(outstanding);

		var recent = await _db.GetTransactionsAsync();
		RecentTransactions.Clear();
		foreach (var t in recent.Take(8))
			RecentTransactions.Add(t);
		HasNoTransactions = RecentTransactions.Count == 0;

		IsBusy = false;
	}

	[RelayCommand]
	private async Task UpdateRateAsync()
	{
		var page = Shell.Current?.CurrentPage;
		if (page is null) return;

		var input = await page.DisplayPromptAsync(
			"Today's Gold Rate",
			"Enter rate per gram for 24K pure gold",
			accept: "Save",
			cancel: "Cancel",
			initialValue: CurrentRate > 0 ? CurrentRate.ToString("0.##") : string.Empty,
			keyboard: Keyboard.Numeric);

		if (string.IsNullOrWhiteSpace(input)) return;

		if (decimal.TryParse(input, out var newRate) && newRate > 0)
		{
			await _db.SaveRateAsync(newRate);
			await LoadAsync();
		}
		else
		{
			await page.DisplayAlert("Invalid rate", "Please enter a valid positive number.", "OK");
		}
	}

	[RelayCommand]
	private Task GoToBuyAsync() => Shell.Current.GoToAsync("//buygold");

	[RelayCommand]
	private Task GoToSellAsync() => Shell.Current.GoToAsync("//sellgold");

	[RelayCommand]
	private Task GoToLedgerAsync() => Shell.Current.GoToAsync("//ledger");

	[RelayCommand]
	private Task GoToReportsAsync() => Shell.Current.GoToAsync("//reports");
}
