using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GoldLedgerApp.Models;
using GoldLedgerApp.Services;

namespace GoldLedgerApp.ViewModels;

public abstract partial class GoldTransactionViewModel : BaseViewModel
{
	protected readonly DatabaseService Db;
	protected readonly SettingsService Settings;

	private double _computedNet;
	private decimal _computedGoldValue;
	private decimal _computedTotal;
	private decimal _computedBalanceDue;

	public abstract TransactionType Type { get; }

	public static readonly string[] PurityOptions = { "24", "22", "21", "18", "14", "10" };
	public static readonly string[] PaymentModeOptions = { "Cash", "Bank", "Credit" };

	public ObservableCollection<Customer> Customers { get; } = new();

	[ObservableProperty]
	private Customer? selectedCustomer;

	[ObservableProperty]
	private string grossWeightText = string.Empty;

	[ObservableProperty]
	private string selectedPurity = "24";

	[ObservableProperty]
	private string rateText = string.Empty;

	[ObservableProperty]
	private string makingChargesText = "0";

	[ObservableProperty]
	private string amountPaidText = string.Empty;

	[ObservableProperty]
	private string selectedPaymentMode = "Cash";

	[ObservableProperty]
	private string notes = string.Empty;

	[ObservableProperty]
	private string netWeightDisplay = "0.000 g";

	[ObservableProperty]
	private string goldValueDisplay = string.Empty;

	[ObservableProperty]
	private string totalAmountDisplay = string.Empty;

	[ObservableProperty]
	private string balanceDueDisplay = string.Empty;

	protected GoldTransactionViewModel(DatabaseService db, SettingsService settings)
	{
		Db = db;
		Settings = settings;
	}

	[RelayCommand]
	public async Task LoadAsync()
	{
		var customers = await Db.GetCustomersAsync();
		Customers.Clear();
		foreach (var c in customers)
			Customers.Add(c);

		var rate = await Db.GetLatestRateAsync();
		if (rate is not null)
			RateText = rate.RatePerGram24K.ToString("0.##");

		SelectedPurity = Settings.DefaultPurityKarat.ToString("0.##");
		ResetForm();
	}

	private void ResetForm()
	{
		SelectedCustomer = null;
		GrossWeightText = string.Empty;
		MakingChargesText = "0";
		AmountPaidText = string.Empty;
		SelectedPaymentMode = "Cash";
		Notes = string.Empty;
		Recalculate();
	}

	partial void OnGrossWeightTextChanged(string value) => Recalculate();
	partial void OnSelectedPurityChanged(string value) => Recalculate();
	partial void OnRateTextChanged(string value) => Recalculate();
	partial void OnMakingChargesTextChanged(string value) => Recalculate();
	partial void OnAmountPaidTextChanged(string value) => Recalculate();

	private void Recalculate()
	{
		double.TryParse(GrossWeightText, out var gross);
		double.TryParse(SelectedPurity, out var purity);
		decimal.TryParse(RateText, out var rate);
		decimal.TryParse(MakingChargesText, out var making);
		decimal.TryParse(AmountPaidText, out var paid);

		if (purity <= 0) purity = 24;

		_computedNet = gross * (purity / 24.0);
		_computedGoldValue = (decimal)_computedNet * rate;
		_computedTotal = _computedGoldValue + making;
		_computedBalanceDue = _computedTotal - paid;

		NetWeightDisplay = Settings.FormatWeight(_computedNet);
		GoldValueDisplay = Settings.FormatAmount(_computedGoldValue);
		TotalAmountDisplay = Settings.FormatAmount(_computedTotal);
		BalanceDueDisplay = Settings.FormatAmount(_computedBalanceDue);
	}

	[RelayCommand]
	private async Task SaveAsync()
	{
		var page = Shell.Current?.CurrentPage;
		if (page is null) return;

		double.TryParse(GrossWeightText, out var gross);
		if (gross <= 0)
		{
			await page.DisplayAlert("Missing weight", "Please enter the gross weight in grams.", "OK");
			return;
		}

		decimal.TryParse(RateText, out var rate);
		if (rate <= 0)
		{
			await page.DisplayAlert("Missing rate", "Please enter today's gold rate per gram.", "OK");
			return;
		}

		decimal.TryParse(MakingChargesText, out var making);
		decimal.TryParse(AmountPaidText, out var paid);
		double.TryParse(SelectedPurity, out var purity);

		Recalculate();

		var transaction = new GoldTransaction
		{
			Type = Type,
			CustomerId = SelectedCustomer?.Id,
			Date = DateTime.Now,
			GrossWeightGrams = gross,
			PurityKarat = purity <= 0 ? 24 : purity,
			NetWeightGrams = _computedNet,
			RatePerGram = rate,
			GoldValue = _computedGoldValue,
			MakingCharges = making,
			TotalAmount = _computedTotal,
			AmountPaid = paid,
			BalanceDue = _computedBalanceDue,
			PaymentMode = (PaymentMode)Array.IndexOf(PaymentModeOptions, SelectedPaymentMode),
			Notes = Notes
		};

		await Db.SaveGoldTransactionAsync(transaction);

		var verb = Type == TransactionType.Buy ? "Purchase" : "Sale";
		await page.DisplayAlert("Saved", $"{verb} of {Settings.FormatWeight(_computedNet)} recorded successfully.", "OK");

		ResetForm();
		await Shell.Current.GoToAsync("//dashboard");
	}
}
