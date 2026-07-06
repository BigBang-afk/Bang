using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace GeneralStorePro.ViewModels;

public partial class PurchaseLine : ObservableObject
{
    public required string ProductName { get; init; }

    [ObservableProperty]
    private decimal unitCost;

    [ObservableProperty]
    private double quantity = 1;

    public decimal LineTotal => (decimal)Quantity * UnitCost;

    partial void OnQuantityChanged(double value) => OnPropertyChanged(nameof(LineTotal));

    partial void OnUnitCostChanged(decimal value) => OnPropertyChanged(nameof(LineTotal));
}

public partial class PurchaseViewModel : ViewModelBase
{
    public ObservableCollection<string> Suppliers { get; } = new()
    {
        "Global Foods Distributors",
        "Fresh Farm Supplies",
        "National Beverages Co."
    };

    public ObservableCollection<string> AvailableProducts { get; } = new()
    {
        "Rice 5kg",
        "Cooking Oil 1L",
        "Sugar 1kg",
        "Wheat Flour 2kg",
        "Tea Pack 500g"
    };

    public ObservableCollection<PurchaseLine> PurchaseLines { get; } = new();

    [ObservableProperty]
    private string? selectedSupplier;

    [ObservableProperty]
    private string? productToAdd;

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

    public PurchaseViewModel()
    {
        SelectedSupplier = Suppliers.FirstOrDefault();
    }

    partial void OnDiscountChanged(decimal value) => RecalculateTotals();

    partial void OnPaidAmountChanged(decimal value) => RecalculateTotals();

    [RelayCommand]
    private void AddLine()
    {
        if (string.IsNullOrWhiteSpace(ProductToAdd))
        {
            return;
        }

        var existing = PurchaseLines.FirstOrDefault(l => l.ProductName == ProductToAdd);
        if (existing is not null)
        {
            existing.Quantity += 1;
        }
        else
        {
            var line = new PurchaseLine { ProductName = ProductToAdd };
            line.PropertyChanged += OnLineChanged;
            PurchaseLines.Add(line);
        }

        RecalculateTotals();
    }

    [RelayCommand]
    private void RemoveLine(PurchaseLine? line)
    {
        if (line is null)
        {
            return;
        }

        line.PropertyChanged -= OnLineChanged;
        PurchaseLines.Remove(line);
        RecalculateTotals();
    }

    [RelayCommand]
    private void SavePurchase()
    {
        foreach (var line in PurchaseLines)
        {
            line.PropertyChanged -= OnLineChanged;
        }

        PurchaseLines.Clear();
        Discount = 0;
        PaidAmount = 0;
        RecalculateTotals();
    }

    private void OnLineChanged(object? sender, PropertyChangedEventArgs e) => RecalculateTotals();

    private void RecalculateTotals()
    {
        SubTotal = PurchaseLines.Sum(l => l.LineTotal);
        Total = Math.Max(0, SubTotal - Discount);
        DueAmount = Math.Max(0, Total - PaidAmount);
    }
}
