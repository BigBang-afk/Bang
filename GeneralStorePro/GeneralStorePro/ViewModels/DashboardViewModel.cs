using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using LiveChartsCore;
using LiveChartsCore.SkiaSharpView;

namespace GeneralStorePro.ViewModels;

public sealed record LowStockItem(string ProductName, double CurrentStock, double ReorderLevel);

public partial class DashboardViewModel : ViewModelBase
{
    [ObservableProperty]
    private decimal todaysSales = 24850m;

    [ObservableProperty]
    private decimal todaysPurchases = 9200m;

    [ObservableProperty]
    private decimal customersDue = 18650m;

    [ObservableProperty]
    private decimal suppliersDue = 12400m;

    [ObservableProperty]
    private decimal cashInHand = 63500m;

    [ObservableProperty]
    private int lowStockCount = 3;

    public ObservableCollection<ISeries> SalesSeries { get; }

    public ObservableCollection<LowStockItem> LowStockItems { get; }

    public DashboardViewModel()
    {
        SalesSeries = new ObservableCollection<ISeries>
        {
            new LineSeries<double>
            {
                Name = "Sales (last 7 days)",
                Values = new double[] { 15200, 18400, 16100, 21300, 19800, 24850, 22100 },
                Fill = null,
                GeometrySize = 6
            }
        };

        LowStockItems = new ObservableCollection<LowStockItem>
        {
            new("Sugar 1kg", 3, 10),
            new("Cooking Oil 1L", 2, 15),
            new("Rice 5kg", 4, 10)
        };
    }
}
