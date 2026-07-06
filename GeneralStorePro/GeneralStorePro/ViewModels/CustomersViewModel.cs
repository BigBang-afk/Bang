using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Windows.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GeneralStorePro.Data.Repositories;
using GeneralStorePro.Models;
using GeneralStorePro.Services;

namespace GeneralStorePro.ViewModels;

public partial class CustomerEditorModel : ObservableObject
{
    public int Id { get; set; }

    [ObservableProperty]
    private string name = string.Empty;

    [ObservableProperty]
    private string phone = string.Empty;

    [ObservableProperty]
    private string address = string.Empty;

    [ObservableProperty]
    private decimal creditLimit;

    [ObservableProperty]
    private decimal openingBalance;

    [ObservableProperty]
    private decimal currentBalance;
}

public partial class CustomersViewModel : ViewModelBase
{
    public ObservableCollection<Customer> Customers { get; } = new();

    public ObservableCollection<CustomerLedgerEntry> Ledger { get; } = new();

    public ObservableCollection<string> PaymentMethods { get; } = new() { "Cash", "Card", "BankTransfer", "Other" };

    public ICollectionView CustomersView { get; }

    [ObservableProperty]
    private string searchText = string.Empty;

    [ObservableProperty]
    private Customer? selectedCustomer;

    [ObservableProperty]
    private bool isEditorOpen;

    [ObservableProperty]
    private bool isNewCustomer;

    [ObservableProperty]
    private CustomerEditorModel editor = new();

    [ObservableProperty]
    private decimal paymentAmount;

    [ObservableProperty]
    private string paymentMethod = "Cash";

    [ObservableProperty]
    private string? paymentNotes;

    [ObservableProperty]
    private string? statusMessage;

    public CustomersViewModel()
    {
        CustomersView = CollectionViewSource.GetDefaultView(Customers);
        CustomersView.Filter = FilterCustomers;
        LoadCustomers();
    }

    public bool ShowLedgerSection => IsEditorOpen && !IsNewCustomer;

    partial void OnSearchTextChanged(string value) => CustomersView.Refresh();

    partial void OnIsEditorOpenChanged(bool value) => OnPropertyChanged(nameof(ShowLedgerSection));

    partial void OnIsNewCustomerChanged(bool value) => OnPropertyChanged(nameof(ShowLedgerSection));

    partial void OnSelectedCustomerChanged(Customer? value)
    {
        IsEditorOpen = value is not null;
        IsNewCustomer = false;
        StatusMessage = null;
        Ledger.Clear();

        if (value is null)
        {
            return;
        }

        Editor = new CustomerEditorModel
        {
            Id = value.Id,
            Name = value.Name,
            Phone = value.Phone ?? string.Empty,
            Address = value.Address ?? string.Empty,
            CreditLimit = value.CreditLimit,
            OpeningBalance = value.OpeningBalance,
            CurrentBalance = value.CurrentBalance
        };

        foreach (var entry in CustomerRepository.GetLedger(value.Id))
        {
            Ledger.Add(entry);
        }
    }

    private void LoadCustomers()
    {
        Customers.Clear();
        foreach (var customer in CustomerRepository.GetActiveCustomers())
        {
            Customers.Add(customer);
        }

        CustomersView.Refresh();
    }

    private bool FilterCustomers(object obj)
    {
        if (string.IsNullOrWhiteSpace(SearchText))
        {
            return true;
        }

        return obj is Customer c &&
               (c.Name.Contains(SearchText, StringComparison.OrdinalIgnoreCase) ||
                (c.Phone ?? string.Empty).Contains(SearchText, StringComparison.OrdinalIgnoreCase));
    }

    [RelayCommand]
    private void AddNew()
    {
        SelectedCustomer = null;
        Editor = new CustomerEditorModel();
        IsNewCustomer = true;
        IsEditorOpen = true;
        StatusMessage = null;
    }

    [RelayCommand]
    private void SaveCustomer()
    {
        if (string.IsNullOrWhiteSpace(Editor.Name))
        {
            StatusMessage = "Customer name is required.";
            return;
        }

        if (IsNewCustomer)
        {
            var newId = CustomerRepository.Insert(new Customer
            {
                Name = Editor.Name,
                Phone = Editor.Phone,
                Address = Editor.Address,
                CreditLimit = Editor.CreditLimit,
                OpeningBalance = Editor.OpeningBalance
            });

            LoadCustomers();
            SelectedCustomer = Customers.FirstOrDefault(c => c.Id == newId);
        }
        else
        {
            CustomerRepository.Update(new Customer
            {
                Id = Editor.Id,
                Name = Editor.Name,
                Phone = Editor.Phone,
                Address = Editor.Address,
                CreditLimit = Editor.CreditLimit
            });

            var savedId = Editor.Id;
            LoadCustomers();
            SelectedCustomer = Customers.FirstOrDefault(c => c.Id == savedId);
        }

        StatusMessage = "Saved.";
    }

    [RelayCommand]
    private void DeleteSelected()
    {
        if (SelectedCustomer is null)
        {
            return;
        }

        CustomerRepository.Deactivate(SelectedCustomer.Id);
        LoadCustomers();
        SelectedCustomer = null;
    }

    [RelayCommand]
    private void CloseEditor() => SelectedCustomer = null;

    [RelayCommand]
    private void ReceivePayment()
    {
        if (SelectedCustomer is null)
        {
            return;
        }

        if (PaymentAmount <= 0)
        {
            StatusMessage = "Enter a payment amount greater than zero.";
            return;
        }

        var userId = SessionService.CurrentUser?.Id
            ?? throw new InvalidOperationException("No user is signed in.");

        CustomerPaymentRepository.RecordPayment(SelectedCustomer.Id, userId, PaymentAmount, PaymentMethod, PaymentNotes);

        var customerId = SelectedCustomer.Id;
        PaymentAmount = 0;
        PaymentNotes = null;

        LoadCustomers();
        SelectedCustomer = Customers.FirstOrDefault(c => c.Id == customerId);
        StatusMessage = "Payment recorded.";
    }

    [RelayCommand]
    private void PrintLedger()
    {
        if (SelectedCustomer is null)
        {
            return;
        }

        var settings = SettingsRepository.GetAll();

        var data = new CustomerStatementData(
            settings.GetValueOrDefault("StoreName", "General Store"),
            settings.GetValueOrDefault("StoreAddress", string.Empty),
            settings.GetValueOrDefault("StorePhone", string.Empty),
            SelectedCustomer.Name,
            SelectedCustomer.Phone,
            DateTime.Now,
            Ledger.ToList(),
            SelectedCustomer.CurrentBalance);

        StatementPrinter.PrintCustomerStatement(data);
    }
}
