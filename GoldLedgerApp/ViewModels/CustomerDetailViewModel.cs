using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GoldLedgerApp.Models;
using GoldLedgerApp.Services;

namespace GoldLedgerApp.ViewModels;

[QueryProperty(nameof(CustomerIdParam), "CustomerId")]
public partial class CustomerDetailViewModel : BaseViewModel
{
	private readonly DatabaseService _db;
	private readonly SettingsService _settings;
	private int _customerId;

	[ObservableProperty]
	private string customerIdParam = "0";

	[ObservableProperty]
	private bool isNewCustomer = true;

	[ObservableProperty]
	private string name = string.Empty;

	[ObservableProperty]
	private string phone = string.Empty;

	[ObservableProperty]
	private string address = string.Empty;

	[ObservableProperty]
	private string openingBalanceText = "0";

	[ObservableProperty]
	private string balanceText = string.Empty;

	[ObservableProperty]
	private Color balanceColor = Colors.White;

	[ObservableProperty]
	private string balanceCaption = string.Empty;

	[ObservableProperty]
	private bool hasNoEntries;

	public ObservableCollection<LedgerEntry> Entries { get; } = new();

	public CustomerDetailViewModel(DatabaseService db, SettingsService settings)
	{
		_db = db;
		_settings = settings;
	}

	partial void OnCustomerIdParamChanged(string value)
	{
		_customerId = int.TryParse(value, out var id) ? id : 0;
		_ = LoadAsync();
	}

	[RelayCommand]
	public async Task LoadAsync()
	{
		IsBusy = true;

		if (_customerId == 0)
		{
			IsNewCustomer = true;
			Title = "New Customer";
			Name = Phone = Address = string.Empty;
			OpeningBalanceText = "0";
			Entries.Clear();
			IsBusy = false;
			return;
		}

		var customer = await _db.GetCustomerAsync(_customerId);
		if (customer is null)
		{
			IsBusy = false;
			return;
		}

		IsNewCustomer = false;
		Title = customer.Name;
		Name = customer.Name;
		Phone = customer.Phone;
		Address = customer.Address;
		OpeningBalanceText = customer.OpeningBalance.ToString("0.##");

		var balance = await _db.GetCustomerBalanceAsync(_customerId);
		UpdateBalanceDisplay(balance);

		var entries = await _db.GetLedgerEntriesAsync(_customerId);
		Entries.Clear();
		foreach (var e in entries)
			Entries.Add(e);
		HasNoEntries = Entries.Count == 0;

		IsBusy = false;
	}

	private void UpdateBalanceDisplay(decimal balance)
	{
		BalanceText = _settings.FormatAmount(Math.Abs(balance));

		if (balance > 0)
		{
			BalanceColor = (Color)Application.Current!.Resources["Danger"];
			BalanceCaption = "Customer owes shop";
		}
		else if (balance < 0)
		{
			BalanceColor = (Color)Application.Current!.Resources["Success"];
			BalanceCaption = "Shop owes customer";
		}
		else
		{
			BalanceColor = Colors.White;
			BalanceCaption = "Settled";
		}
	}

	[RelayCommand]
	private async Task SaveAsync()
	{
		var page = Shell.Current?.CurrentPage;

		if (string.IsNullOrWhiteSpace(Name))
		{
			if (page is not null)
				await page.DisplayAlert("Name required", "Please enter a customer name.", "OK");
			return;
		}

		decimal.TryParse(OpeningBalanceText, out var opening);

		if (IsNewCustomer)
		{
			var customer = new Customer
			{
				Name = Name.Trim(),
				Phone = Phone.Trim(),
				Address = Address.Trim(),
				OpeningBalance = opening
			};
			await _db.SaveCustomerAsync(customer);
			_customerId = customer.Id;
		}
		else
		{
			var customer = await _db.GetCustomerAsync(_customerId);
			if (customer is null) return;

			customer.Name = Name.Trim();
			customer.Phone = Phone.Trim();
			customer.Address = Address.Trim();
			customer.OpeningBalance = opening;
			await _db.SaveCustomerAsync(customer);
		}

		await Shell.Current.GoToAsync("..");
	}

	[RelayCommand]
	private async Task AddPaymentAsync()
	{
		var page = Shell.Current?.CurrentPage;
		if (page is null) return;

		var input = await page.DisplayPromptAsync(
			"Add Payment",
			"Enter amount received from this customer",
			accept: "Add",
			cancel: "Cancel",
			keyboard: Keyboard.Numeric);

		if (string.IsNullOrWhiteSpace(input)) return;

		if (decimal.TryParse(input, out var amount) && amount > 0)
		{
			await _db.AddLedgerEntryAsync(_customerId, LedgerEntryType.Credit, amount,
				LedgerReferenceType.Payment, null, "Payment received");
			await LoadAsync();
		}
	}

	[RelayCommand]
	private async Task DeleteCustomerAsync()
	{
		var page = Shell.Current?.CurrentPage;
		if (page is null || IsNewCustomer) return;

		var confirm = await page.DisplayAlert("Delete Customer",
			$"Delete {Name} and all their ledger history? This cannot be undone.", "Delete", "Cancel");
		if (!confirm) return;

		var customer = await _db.GetCustomerAsync(_customerId);
		if (customer is null) return;

		await _db.DeleteCustomerAsync(customer);
		await Shell.Current.GoToAsync("..");
	}
}
