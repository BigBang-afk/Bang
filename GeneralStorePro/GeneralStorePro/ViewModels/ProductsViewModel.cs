using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace GeneralStorePro.ViewModels;

public partial class ProductRow : ObservableObject
{
    [ObservableProperty]
    private string name = "New Product";

    [ObservableProperty]
    private string sku = string.Empty;

    [ObservableProperty]
    private string category = "General";

    [ObservableProperty]
    private string unit = "pcs";

    [ObservableProperty]
    private decimal purchasePrice;

    [ObservableProperty]
    private decimal salePrice;

    [ObservableProperty]
    private double stock;

    [ObservableProperty]
    private double reorderLevel = 5;

    public bool IsLowStock => Stock <= ReorderLevel;

    partial void OnStockChanged(double value) => OnPropertyChanged(nameof(IsLowStock));

    partial void OnReorderLevelChanged(double value) => OnPropertyChanged(nameof(IsLowStock));
}

public partial class ProductsViewModel : ViewModelBase
{
    public ObservableCollection<ProductRow> Products { get; } = new()
    {
        new() { Name = "Rice 5kg", Sku = "SKU-1001", Category = "Groceries", Unit = "bag", PurchasePrice = 9.00m, SalePrice = 12.50m, Stock = 42, ReorderLevel = 10 },
        new() { Name = "Cooking Oil 1L", Sku = "SKU-1002", Category = "Groceries", Unit = "bottle", PurchasePrice = 2.60m, SalePrice = 3.75m, Stock = 15, ReorderLevel = 15 },
        new() { Name = "Sugar 1kg", Sku = "SKU-1003", Category = "Groceries", Unit = "pack", PurchasePrice = 0.85m, SalePrice = 1.20m, Stock = 3, ReorderLevel = 10 },
        new() { Name = "Wheat Flour 2kg", Sku = "SKU-1004", Category = "Groceries", Unit = "bag", PurchasePrice = 2.10m, SalePrice = 2.90m, Stock = 26, ReorderLevel = 8 },
        new() { Name = "Tea Pack 500g", Sku = "SKU-1005", Category = "Beverages", Unit = "pack", PurchasePrice = 2.90m, SalePrice = 4.10m, Stock = 18, ReorderLevel = 6 }
    };

    public ICollectionView ProductsView { get; }

    [ObservableProperty]
    private string searchText = string.Empty;

    [ObservableProperty]
    private ProductRow? selectedProduct;

    [ObservableProperty]
    private bool isEditorOpen;

    public ProductsViewModel()
    {
        ProductsView = CollectionViewSource.GetDefaultView(Products);
        ProductsView.Filter = FilterProducts;
    }

    partial void OnSearchTextChanged(string value) => ProductsView.Refresh();

    partial void OnSelectedProductChanged(ProductRow? value) => IsEditorOpen = value is not null;

    private bool FilterProducts(object obj)
    {
        if (string.IsNullOrWhiteSpace(SearchText))
        {
            return true;
        }

        return obj is ProductRow p &&
               (p.Name.Contains(SearchText, StringComparison.OrdinalIgnoreCase) ||
                p.Sku.Contains(SearchText, StringComparison.OrdinalIgnoreCase));
    }

    [RelayCommand]
    private void AddNew()
    {
        var row = new ProductRow();
        Products.Add(row);
        SelectedProduct = row;
    }

    [RelayCommand]
    private void DeleteSelected()
    {
        if (SelectedProduct is null)
        {
            return;
        }

        Products.Remove(SelectedProduct);
        SelectedProduct = null;
    }

    [RelayCommand]
    private void CloseEditor() => SelectedProduct = null;
}
