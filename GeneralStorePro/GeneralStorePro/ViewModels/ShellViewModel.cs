using System;
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GeneralStorePro.Models;
using GeneralStorePro.Services;

namespace GeneralStorePro.ViewModels;

public partial class ShellViewModel : ViewModelBase
{
    public ObservableCollection<NavItem> NavItems { get; } = new()
    {
        new NavItem("\U0001F3E0", "Dashboard", "Dashboard"),
        new NavItem("\U0001F9FE", "POS Billing", "POS"),
        new NavItem("\U0001F4E6", "Products", "Products"),
        new NavItem("\U0001F6D2", "Purchases", "Purchases"),
        new NavItem("\U0001F465", "Customers", "Customers"),
        new NavItem("\U0001F69A", "Suppliers", "Suppliers"),
        new NavItem("\U0001F4B5", "Expenses", "Expenses"),
        new NavItem("\U0001F4CA", "Reports", "Reports"),
        new NavItem("⚙", "Settings", "Settings"),
    };

    [ObservableProperty]
    private NavItem? selectedNavItem;

    [ObservableProperty]
    private ViewModelBase? currentViewModel;

    public string CurrentUserName => SessionService.CurrentUser?.FullName ?? "Guest";

    public event EventHandler? LogoutRequested;

    public ShellViewModel()
    {
        SelectedNavItem = NavItems[0];
    }

    partial void OnSelectedNavItemChanged(NavItem? value)
    {
        if (value is null)
        {
            return;
        }

        CurrentViewModel = value.PageKey switch
        {
            "Dashboard" => new DashboardViewModel(),
            "POS" => new POSViewModel(),
            "Products" => new ProductsViewModel(),
            "Purchases" => new PurchaseViewModel(),
            "Customers" => new CustomersViewModel(),
            "Suppliers" => new SuppliersViewModel(),
            "Expenses" => new ExpensesViewModel(),
            "Reports" => new ReportsViewModel(),
            "Settings" => new SettingsViewModel(),
            _ => CurrentViewModel
        };
    }

    [RelayCommand]
    private void Logout()
    {
        SessionService.CurrentUser = null;
        LogoutRequested?.Invoke(this, EventArgs.Empty);
    }
}
