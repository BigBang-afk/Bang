using System;
using System.Collections.ObjectModel;

namespace GeneralStorePro.ViewModels;

public sealed record SalesReportRow(DateTime Date, string InvoiceNumber, string Customer, decimal Total);

public sealed record StockReportRow(string ProductName, double Stock, double ReorderLevel);

public sealed record DueReportRow(string Name, decimal Balance);

public partial class ReportsViewModel : ViewModelBase
{
    public ObservableCollection<SalesReportRow> RecentSales { get; } = new()
    {
        new(DateTime.Now.AddHours(-2), "INV-1042", "Aarav Traders", 340.50m),
        new(DateTime.Now.AddHours(-5), "INV-1041", "Walk-in Customer", 58.00m),
        new(DateTime.Now.AddDays(-1), "INV-1040", "Meera Kirana Shop", 212.75m),
        new(DateTime.Now.AddDays(-1), "INV-1039", "Walk-in Customer", 44.20m)
    };

    public ObservableCollection<StockReportRow> StockLevels { get; } = new()
    {
        new("Sugar 1kg", 3, 10),
        new("Cooking Oil 1L", 2, 15),
        new("Rice 5kg", 42, 10),
        new("Wheat Flour 2kg", 26, 8)
    };

    public ObservableCollection<DueReportRow> CustomerDues { get; } = new()
    {
        new("Aarav Traders", 1250m),
        new("Rohan Fashions", 640m)
    };

    public ObservableCollection<DueReportRow> SupplierDues { get; } = new()
    {
        new("Global Foods Distributors", 4200m),
        new("National Beverages Co.", 1580m)
    };

    public decimal TotalSalesToday => 24850m;

    public decimal TotalPurchasesToday => 9200m;

    public decimal GrossProfitToday => TotalSalesToday - TotalPurchasesToday;
}
