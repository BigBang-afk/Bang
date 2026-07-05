using System.Collections.ObjectModel;
using System.Text;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GoldLedgerApp.Models;
using GoldLedgerApp.Services;

namespace GoldLedgerApp.ViewModels;

public partial class ReportsViewModel : BaseViewModel
{
	private readonly DatabaseService _db;
	private readonly SettingsService _settings;
	private bool _suppressReload;

	[ObservableProperty]
	private DateTime fromDate = DateTime.Today.AddDays(-6);

	[ObservableProperty]
	private DateTime toDate = DateTime.Today;

	[ObservableProperty]
	private string filterType = "All";

	[ObservableProperty]
	private string totalBuyText = string.Empty;

	[ObservableProperty]
	private string totalSellText = string.Empty;

	[ObservableProperty]
	private string netText = string.Empty;

	[ObservableProperty]
	private Color netColor = Colors.White;

	[ObservableProperty]
	private int buyCount;

	[ObservableProperty]
	private int sellCount;

	[ObservableProperty]
	private bool hasNoTransactions;

	public ObservableCollection<GoldTransaction> Transactions { get; } = new();

	public ReportsViewModel(DatabaseService db, SettingsService settings)
	{
		_db = db;
		_settings = settings;
		Title = "Reports";
	}

	[RelayCommand]
	public async Task LoadAsync()
	{
		IsBusy = true;

		TransactionType? typeFilter = FilterType switch
		{
			"Buy" => TransactionType.Buy,
			"Sell" => TransactionType.Sell,
			_ => null
		};

		var transactions = await _db.GetTransactionsAsync(typeFilter, FromDate, ToDate);
		Transactions.Clear();
		foreach (var t in transactions)
			Transactions.Add(t);
		HasNoTransactions = Transactions.Count == 0;

		var (totalBuy, totalSell, buyCountResult, sellCountResult) = await _db.GetSummaryAsync(FromDate, ToDate);
		TotalBuyText = _settings.FormatAmount(totalBuy);
		TotalSellText = _settings.FormatAmount(totalSell);
		BuyCount = buyCountResult;
		SellCount = sellCountResult;

		var net = totalSell - totalBuy;
		NetText = (net >= 0 ? "+" : "-") + _settings.FormatAmount(Math.Abs(net));
		NetColor = net >= 0
			? (Color)Application.Current!.Resources["Success"]
			: (Color)Application.Current!.Resources["Danger"];

		IsBusy = false;
	}

	partial void OnFromDateChanged(DateTime value) => ReloadIfNeeded();
	partial void OnToDateChanged(DateTime value) => ReloadIfNeeded();

	private void ReloadIfNeeded()
	{
		if (_suppressReload) return;
		_ = LoadAsync();
	}

	[RelayCommand]
	private Task SetFilterAsync(string filter)
	{
		FilterType = filter;
		return LoadAsync();
	}

	[RelayCommand]
	private Task SetPresetTodayAsync() => ApplyPreset(DateTime.Today, DateTime.Today);

	[RelayCommand]
	private Task SetPresetWeekAsync() =>
		ApplyPreset(DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek), DateTime.Today);

	[RelayCommand]
	private Task SetPresetMonthAsync() =>
		ApplyPreset(new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1), DateTime.Today);

	[RelayCommand]
	private Task SetPresetAllAsync() => ApplyPreset(new DateTime(2000, 1, 1), DateTime.Today);

	private Task ApplyPreset(DateTime from, DateTime to)
	{
		_suppressReload = true;
		FromDate = from;
		ToDate = to;
		_suppressReload = false;
		return LoadAsync();
	}

	[RelayCommand]
	private async Task ExportCsvAsync()
	{
		var page = Shell.Current?.CurrentPage;
		if (page is null) return;

		if (Transactions.Count == 0)
		{
			await page.DisplayAlert("Nothing to export", "There are no transactions in the selected range.", "OK");
			return;
		}

		var sb = new StringBuilder();
		sb.AppendLine("Date,Type,Customer,Gross Weight (g),Purity (K),Net Weight (g),Rate/g,Gold Value,Making Charges,Total,Paid,Balance Due,Payment Mode,Notes");

		foreach (var t in Transactions)
		{
			sb.AppendLine(string.Join(",",
				t.Date.ToString("yyyy-MM-dd HH:mm"),
				t.Type,
				EscapeCsv(t.CustomerName),
				t.GrossWeightGrams,
				t.PurityKarat,
				t.NetWeightGrams,
				t.RatePerGram,
				t.GoldValue,
				t.MakingCharges,
				t.TotalAmount,
				t.AmountPaid,
				t.BalanceDue,
				t.PaymentMode,
				EscapeCsv(t.Notes)));
		}

		var fileName = $"GoldLedger_Report_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
		var filePath = Path.Combine(FileSystem.CacheDirectory, fileName);
		await File.WriteAllTextAsync(filePath, sb.ToString());

		await Share.Default.RequestAsync(new ShareFileRequest
		{
			Title = "Gold Ledger Report",
			File = new ShareFile(filePath)
		});
	}

	private static string EscapeCsv(string value)
	{
		if (string.IsNullOrEmpty(value)) return string.Empty;
		return value.Contains(',') || value.Contains('"')
			? $"\"{value.Replace("\"", "\"\"")}\""
			: value;
	}
}
