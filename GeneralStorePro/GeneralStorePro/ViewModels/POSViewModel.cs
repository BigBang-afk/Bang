using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Windows.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace GeneralStorePro.ViewModels;

public sealed record ProductQuickPick(string Name, string Sku, decimal Price, double Stock);

public partial class CartLine : ObservableObject
{
    public required string ProductName { get; init; }
    public required decimal UnitPrice { get; init; }

    [ObservableProperty]
    private double quantity = 1;

    public decimal LineTotal => (decimal)Quantity * UnitPrice;

    partial void OnQuantityChanged(double value) => OnPropertyChanged(nameof(LineTotal));
}

public partial class POSViewModel : ViewModelBase
{
    public ObservableCollection<ProductQuickPick> Products { get; }

    public ObservableCollection<CartLine> CartLines { get; } = new();

    public ICollectionView ProductsView { get; }

    [ObservableProperty]
    private string searchText = string.Empty;

    [ObservableProperty]
    private string paymentMethod = "Cash";

    [ObservableProperty]
    private decimal subTotal;

    [ObservableProperty]
    private decimal discount;

    [ObservableProperty]
    private decimal total;

    [ObservableProperty]
    private decimal paidAmount;

    [ObservableProperty]
    private decimal dueAmount;

    public POSViewModel()
    {
        Products = new ObservableCollection<ProductQuickPick>
        {
            new("Rice 5kg", "SKU-1001", 12.50m, 42),
            new("Cooking Oil 1L", "SKU-1002", 3.75m, 15),
            new("Sugar 1kg", "SKU-1003", 1.20m, 10),
            new("Wheat Flour 2kg", "SKU-1004", 2.90m, 26),
            new("Tea Pack 500g", "SKU-1005", 4.10m, 18),
            new("Salt 1kg", "SKU-1006", 0.60m, 50),
            new("Detergent 1kg", "SKU-1007", 3.30m, 22),
            new("Milk Powder 400g", "SKU-1008", 6.75m, 12)
        };

        ProductsView = CollectionViewSource.GetDefaultView(Products);
        ProductsView.Filter = FilterProducts;

        CartLines.CollectionChanged += (_, _) => RecalculateTotals();
    }

    partial void OnSearchTextChanged(string value) => ProductsView.Refresh();

    partial void OnDiscountChanged(decimal value) => RecalculateTotals();

    partial void OnPaidAmountChanged(decimal value) => RecalculateTotals();

    private bool FilterProducts(object obj)
    {
        if (string.IsNullOrWhiteSpace(SearchText))
        {
            return true;
        }

        return obj is ProductQuickPick p &&
               (p.Name.Contains(SearchText, StringComparison.OrdinalIgnoreCase) ||
                p.Sku.Contains(SearchText, StringComparison.OrdinalIgnoreCase));
    }

    [RelayCommand]
    private void AddToCart(ProductQuickPick? product)
    {
        if (product is null)
        {
            return;
        }

        var existing = CartLines.FirstOrDefault(l => l.ProductName == product.Name);
        if (existing is not null)
        {
            existing.Quantity += 1;
        }
        else
        {
            var line = new CartLine { ProductName = product.Name, UnitPrice = product.Price };
            line.PropertyChanged += OnCartLineChanged;
            CartLines.Add(line);
        }

        RecalculateTotals();
    }

    [RelayCommand]
    private void RemoveLine(CartLine? line)
    {
        if (line is null)
        {
            return;
        }

        line.PropertyChanged -= OnCartLineChanged;
        CartLines.Remove(line);
        RecalculateTotals();
    }

    [RelayCommand]
    private void Checkout()
    {
        foreach (var line in CartLines)
        {
            line.PropertyChanged -= OnCartLineChanged;
        }

        CartLines.Clear();
        Discount = 0;
        PaidAmount = 0;
        RecalculateTotals();
    }

    private void OnCartLineChanged(object? sender, PropertyChangedEventArgs e) => RecalculateTotals();

    private void RecalculateTotals()
    {
        SubTotal = CartLines.Sum(l => l.LineTotal);
        Total = Math.Max(0, SubTotal - Discount);
        DueAmount = Math.Max(0, Total - PaidAmount);
    }
}
