using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GoldLedgerApp.Models;
using GoldLedgerApp.Services;

namespace GoldLedgerApp.ViewModels;

public partial class CustomerLedgerViewModel : BaseViewModel
{
	private readonly DatabaseService _db;
	private readonly SettingsService _settings;

	[ObservableProperty]
	private string searchText = string.Empty;

	[ObservableProperty]
	private bool hasNoCustomers;

	[ObservableProperty]
	private string totalOutstandingText = string.Empty;

	public ObservableCollection<Customer> Customers { get; } = new();

	public CustomerLedgerViewModel(DatabaseService db, SettingsService settings)
	{
		_db = db;
		_settings = settings;
		Title = "Customer Ledger";
	}

	[RelayCommand]
	public async Task LoadAsync()
	{
		IsBusy = true;

		var customers = await _db.GetCustomersAsync(SearchText);
		Customers.Clear();
		foreach (var c in customers)
			Customers.Add(c);

		HasNoCustomers = Customers.Count == 0;
		TotalOutstandingText = _settings.FormatAmount(customers.Sum(c => c.CurrentBalance));

		IsBusy = false;
	}

	partial void OnSearchTextChanged(string value) => _ = LoadAsync();

	[RelayCommand]
	private Task AddCustomerAsync() => Shell.Current.GoToAsync("CustomerDetailPage?CustomerId=0");

	[RelayCommand]
	private Task OpenCustomerAsync(Customer customer) => Shell.Current.GoToAsync($"CustomerDetailPage?CustomerId={customer.Id}");
}
