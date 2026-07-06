using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace GeneralStorePro.ViewModels;

public partial class SupplierRow : ObservableObject
{
    [ObservableProperty]
    private string name = "New Supplier";

    [ObservableProperty]
    private string phone = string.Empty;

    [ObservableProperty]
    private string address = string.Empty;

    [ObservableProperty]
    private decimal currentBalance;

    public bool HasDue => CurrentBalance > 0;

    partial void OnCurrentBalanceChanged(decimal value) => OnPropertyChanged(nameof(HasDue));
}

public partial class SuppliersViewModel : ViewModelBase
{
    public ObservableCollection<SupplierRow> Suppliers { get; } = new()
    {
        new() { Name = "Global Foods Distributors", Phone = "555-0201", Address = "22 Industrial Ave", CurrentBalance = 4200 },
        new() { Name = "Fresh Farm Supplies", Phone = "555-0202", Address = "7 Harvest Road", CurrentBalance = 0 },
        new() { Name = "National Beverages Co.", Phone = "555-0203", Address = "101 Warehouse Blvd", CurrentBalance = 1580 }
    };

    public ICollectionView SuppliersView { get; }

    [ObservableProperty]
    private string searchText = string.Empty;

    [ObservableProperty]
    private SupplierRow? selectedSupplier;

    [ObservableProperty]
    private bool isEditorOpen;

    public SuppliersViewModel()
    {
        SuppliersView = CollectionViewSource.GetDefaultView(Suppliers);
        SuppliersView.Filter = FilterSuppliers;
    }

    partial void OnSearchTextChanged(string value) => SuppliersView.Refresh();

    partial void OnSelectedSupplierChanged(SupplierRow? value) => IsEditorOpen = value is not null;

    private bool FilterSuppliers(object obj)
    {
        if (string.IsNullOrWhiteSpace(SearchText))
        {
            return true;
        }

        return obj is SupplierRow s &&
               (s.Name.Contains(SearchText, StringComparison.OrdinalIgnoreCase) ||
                s.Phone.Contains(SearchText, StringComparison.OrdinalIgnoreCase));
    }

    [RelayCommand]
    private void AddNew()
    {
        var row = new SupplierRow();
        Suppliers.Add(row);
        SelectedSupplier = row;
    }

    [RelayCommand]
    private void DeleteSelected()
    {
        if (SelectedSupplier is null)
        {
            return;
        }

        Suppliers.Remove(SelectedSupplier);
        SelectedSupplier = null;
    }

    [RelayCommand]
    private void CloseEditor() => SelectedSupplier = null;
}
