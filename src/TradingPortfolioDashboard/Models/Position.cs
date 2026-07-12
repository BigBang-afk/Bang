using CommunityToolkit.Mvvm.ComponentModel;

namespace TradingPortfolioDashboard.Models;

public partial class Position : ObservableObject
{
    public string Symbol { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal AvgCost { get; set; }
    public decimal RealizedPnL { get; set; }
    public double AllocationPct { get; set; }

    [ObservableProperty]
    private decimal _currentPrice;

    partial void OnCurrentPriceChanged(decimal value)
    {
        OnPropertyChanged(nameof(MarketValue));
        OnPropertyChanged(nameof(CostBasis));
        OnPropertyChanged(nameof(UnrealizedPnL));
        OnPropertyChanged(nameof(UnrealizedPnLPct));
    }

    public decimal MarketValue => Quantity * CurrentPrice;
    public decimal CostBasis => Quantity * AvgCost;
    public decimal UnrealizedPnL => MarketValue - CostBasis;
    public decimal UnrealizedPnLPct => CostBasis == 0 ? 0 : UnrealizedPnL / CostBasis;
    public decimal TotalPnL => UnrealizedPnL + RealizedPnL;
}
