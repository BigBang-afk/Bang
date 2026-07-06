using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace GeneralStorePro.ViewModels;

public partial class CustomerRow : ObservableObject
{
    [ObservableProperty]
    private string name = "New Customer";

    [ObservableProperty]
    private string phone = string.Empty;

    [ObservableProperty]
    private string address = string.Empty;

    [ObservableProperty]
    private decimal creditLimit;

    [ObservableProperty]
    private decimal currentBalance;

    public bool HasDue => CurrentBalance > 0;

    partial void OnCurrentBalanceChanged(decimal value) => OnPropertyChanged(nameof(HasDue));
}

public partial class CustomersViewModel : ViewModelBase
{
    public ObservableCollection<CustomerRow> Customers { get; } = new()
    {
        new() { Name = "Aarav Traders", Phone = "555-0101", Address = "12 Market Street", CreditLimit = 5000, CurrentBalance = 1250 },
        new() { Name = "Meera Kirana Shop", Phone = "555-0102", Address = "48 Station Road", CreditLimit = 3000, CurrentBalance = 0 },
        new() { Name = "Rohan Fashions", Phone = "555-0103", Address = "9 Mill Lane", CreditLimit = 2000, CurrentBalance = 640 }
    };

    public ICollectionView CustomersView { get; }

    [ObservableProperty]
    private string searchText = string.Empty;

    [ObservableProperty]
    private CustomerRow? selectedCustomer;

    [ObservableProperty]
    private bool isEditorOpen;

    public CustomersViewModel()
    {
        CustomersView = CollectionViewSource.GetDefaultView(Customers);
        CustomersView.Filter = FilterCustomers;
    }

    partial void OnSearchTextChanged(string value) => CustomersView.Refresh();

    partial void OnSelectedCustomerChanged(CustomerRow? value) => IsEditorOpen = value is not null;

    private bool FilterCustomers(object obj)
    {
        if (string.IsNullOrWhiteSpace(SearchText))
        {
            return true;
        }

        return obj is CustomerRow c &&
               (c.Name.Contains(SearchText, StringComparison.OrdinalIgnoreCase) ||
                c.Phone.Contains(SearchText, StringComparison.OrdinalIgnoreCase));
    }

    [RelayCommand]
    private void AddNew()
    {
        var row = new CustomerRow();
        Customers.Add(row);
        SelectedCustomer = row;
    }

    [RelayCommand]
    private void DeleteSelected()
    {
        if (SelectedCustomer is null)
        {
            return;
        }

        Customers.Remove(SelectedCustomer);
        SelectedCustomer = null;
    }

    [RelayCommand]
    private void CloseEditor() => SelectedCustomer = null;
}
