using System;
using System.Collections.ObjectModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GeneralStorePro.Data.Repositories;
using GeneralStorePro.Models;
using GeneralStorePro.Services;
using Microsoft.Win32;

namespace GeneralStorePro.ViewModels;

public partial class ReportsViewModel : ViewModelBase
{
    public ObservableCollection<TodaySaleRow> TodaySales { get; } = new();

    public ObservableCollection<Product> StockLevels { get; } = new();

    public ObservableCollection<Product> LowStockProducts { get; } = new();

    public ObservableCollection<Customer> CustomerBalances { get; } = new();

    public ObservableCollection<Supplier> SupplierBalances { get; } = new();

    public ObservableCollection<Expense> Expenses { get; } = new();

    [ObservableProperty]
    private decimal todaySalesTotal;

    [ObservableProperty]
    private decimal todayRevenue;

    [ObservableProperty]
    private decimal todayCost;

    [ObservableProperty]
    private decimal todayProfit;

    [ObservableProperty]
    private decimal totalExpenses;

    [ObservableProperty]
    private string? exportStatusMessage;

    public ReportsViewModel()
    {
        LoadReports();
    }

    [RelayCommand]
    private void Refresh() => LoadReports();

    [RelayCommand]
    private void ExportToCsv()
    {
        var dialog = new SaveFileDialog
        {
            Title = "Export Reports to CSV",
            Filter = "CSV File (*.csv)|*.csv",
            FileName = $"Reports-{DateTime.Now:yyyyMMdd-HHmmss}.csv"
        };

        if (dialog.ShowDialog() != true)
        {
            return;
        }

        try
        {
            ReportExporter.ExportToCsv(BuildSnapshot(), dialog.FileName);
            ExportStatusMessage = $"Exported to {dialog.FileName}";
        }
        catch (Exception ex)
        {
            ExportStatusMessage = $"Export failed: {ex.Message}";
        }
    }

    [RelayCommand]
    private void ExportToPdf() => ReportExporter.PrintToPdf(BuildSnapshot());

    private ReportsSnapshot BuildSnapshot() => new(
        TodaySales.ToList(),
        TodaySalesTotal,
        TodayRevenue,
        TodayCost,
        TodayProfit,
        StockLevels.ToList(),
        LowStockProducts.ToList(),
        CustomerBalances.ToList(),
        SupplierBalances.ToList(),
        Expenses.ToList(),
        TotalExpenses);

    private void LoadReports()
    {
        TodaySales.Clear();
        foreach (var sale in ReportRepository.GetTodaySales())
        {
            TodaySales.Add(sale);
        }

        TodaySalesTotal = ReportRepository.GetTodaySalesTotal();

        var profit = ReportRepository.GetTodayProfitSummary();
        TodayRevenue = profit.Revenue;
        TodayCost = profit.Cost;
        TodayProfit = profit.Profit;

        StockLevels.Clear();
        LowStockProducts.Clear();
        foreach (var product in ProductRepository.GetActiveProducts())
        {
            StockLevels.Add(product);
            if (product.StockQuantity <= product.ReorderLevel)
            {
                LowStockProducts.Add(product);
            }
        }

        CustomerBalances.Clear();
        foreach (var customer in CustomerRepository.GetActiveCustomers())
        {
            CustomerBalances.Add(customer);
        }

        SupplierBalances.Clear();
        foreach (var supplier in SupplierRepository.GetActiveSuppliers())
        {
            SupplierBalances.Add(supplier);
        }

        Expenses.Clear();
        foreach (var expense in ExpenseRepository.GetAll())
        {
            Expenses.Add(expense);
        }

        TotalExpenses = Expenses.Sum(e => e.Amount);
    }
}
