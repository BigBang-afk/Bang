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

public sealed record ProductQuickPick(int Id, string Name, string Sku, decimal Price, double Stock);

public partial class CartLine : ObservableObject
{
    public required int ProductId { get; init; }
    public required string ProductName { get; init; }
    public required decimal UnitPrice { get; init; }
    public required double AvailableStock { get; init; }

    [ObservableProperty]
    private double quantity = 1;

    public decimal LineTotal => (decimal)Quantity * UnitPrice;

    partial void OnQuantityChanged(double value)
    {
        if (value > AvailableStock)
        {
            Quantity = AvailableStock;
            return;
        }

        if (value < 0)
        {
            Quantity = 0;
            return;
        }

        OnPropertyChanged(nameof(LineTotal));
    }
}

public partial class POSViewModel : ViewModelBase
{
    public ObservableCollection<ProductQuickPick> Products { get; } = new();

    public ObservableCollection<CartLine> CartLines { get; } = new();

    public ObservableCollection<Customer> Customers { get; } = new();

    public ObservableCollection<string> PaymentMethods { get; } = new() { "Cash", "Card", "Credit", "Mixed" };

    public ICollectionView ProductsView { get; }

    [ObservableProperty]
    private string searchText = string.Empty;

    [ObservableProperty]
    private string paymentMethod = "Cash";

    [ObservableProperty]
    private Customer? selectedCustomer;

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

    [ObservableProperty]
    private string? errorMessage;

    [ObservableProperty]
    private string? lastInvoiceNumber;

    public POSViewModel()
    {
        ProductsView = CollectionViewSource.GetDefaultView(Products);
        ProductsView.Filter = FilterProducts;

        LoadProducts();
        LoadCustomers();

        CartLines.CollectionChanged += (_, _) => RecalculateTotals();
    }

    partial void OnSearchTextChanged(string value) => ProductsView.Refresh();

    partial void OnDiscountChanged(decimal value) => RecalculateTotals();

    partial void OnPaidAmountChanged(decimal value) => RecalculateTotals();

    private void LoadProducts()
    {
        Products.Clear();
        foreach (var product in ProductRepository.GetActiveProducts())
        {
            Products.Add(new ProductQuickPick(product.Id, product.Name, product.Sku ?? string.Empty, product.SalePrice, product.StockQuantity));
        }

        ProductsView.Refresh();
    }

    private void LoadCustomers()
    {
        Customers.Clear();
        Customers.Add(new Customer { Id = 0, Name = "Walk-in Customer" });

        foreach (var customer in CustomerRepository.GetActiveCustomers())
        {
            Customers.Add(customer);
        }

        SelectedCustomer = Customers[0];
    }

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

        ErrorMessage = null;
        LastInvoiceNumber = null;

        var existing = CartLines.FirstOrDefault(l => l.ProductId == product.Id);
        if (existing is not null)
        {
            if (existing.Quantity + 1 > product.Stock)
            {
                ErrorMessage = $"Only {product.Stock} of '{product.Name}' in stock.";
                return;
            }

            existing.Quantity += 1;
        }
        else
        {
            if (product.Stock <= 0)
            {
                ErrorMessage = $"'{product.Name}' is out of stock.";
                return;
            }

            var line = new CartLine
            {
                ProductId = product.Id,
                ProductName = product.Name,
                UnitPrice = product.Price,
                AvailableStock = product.Stock
            };
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
        ErrorMessage = null;

        if (CartLines.Count == 0)
        {
            ErrorMessage = "Add at least one product to the cart before checkout.";
            return;
        }

        var items = CartLines
            .Select(l => new SaleItemInput(l.ProductId, l.ProductName, l.Quantity, l.UnitPrice, l.LineTotal))
            .ToList();

        var customerId = SelectedCustomer is { Id: > 0 } ? SelectedCustomer.Id : (int?)null;
        var userId = SessionService.CurrentUser?.Id
            ?? throw new InvalidOperationException("No user is signed in.");

        string invoiceNumber;
        try
        {
            invoiceNumber = SaleRepository.CreateSale(
                customerId,
                userId,
                items,
                SubTotal,
                Discount,
                0m,
                Total,
                PaidAmount,
                DueAmount,
                PaymentMethod);
        }
        catch (InsufficientStockException ex)
        {
            ErrorMessage = ex.Message;
            return;
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Could not save the invoice: {ex.Message}";
            return;
        }

        LastInvoiceNumber = invoiceNumber;
        PrintReceipt(invoiceNumber, items);
        ResetCartAfterSale();
        LoadProducts();
    }

    private void PrintReceipt(string invoiceNumber, IReadOnlyList<SaleItemInput> items)
    {
        var settings = SettingsRepository.GetAll();

        var receiptData = new ReceiptData(
            settings.GetValueOrDefault("StoreName", "General Store"),
            settings.GetValueOrDefault("StoreAddress", string.Empty),
            settings.GetValueOrDefault("StorePhone", string.Empty),
            invoiceNumber,
            DateTime.Now,
            SessionService.CurrentUser?.FullName ?? "Cashier",
            SelectedCustomer is { Id: > 0 } ? SelectedCustomer.Name : null,
            items.Select(i => new ReceiptLine(i.ProductName, i.Quantity, i.UnitPrice, i.LineTotal)).ToList(),
            SubTotal,
            Discount,
            Total,
            PaidAmount,
            DueAmount,
            PaymentMethod);

        ReceiptPrinter.Print(receiptData);
    }

    private void ResetCartAfterSale()
    {
        foreach (var line in CartLines)
        {
            line.PropertyChanged -= OnCartLineChanged;
        }

        CartLines.Clear();
        Discount = 0;
        PaidAmount = 0;
        PaymentMethod = "Cash";
        SelectedCustomer = Customers[0];
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
