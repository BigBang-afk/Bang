using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using LiveChartsCore;
using LiveChartsCore.SkiaSharpView;
using LiveChartsCore.SkiaSharpView.Painting;
using SkiaSharp;
using TradingPortfolioDashboard.Models;
using TradingPortfolioDashboard.Services;

namespace TradingPortfolioDashboard.ViewModels;

public partial class DashboardViewModel : ObservableObject
{
    private static readonly SKColor[] Palette =
    {
        SKColor.Parse("#4C9AFF"), SKColor.Parse("#36B37E"), SKColor.Parse("#FFAB00"),
        SKColor.Parse("#FF5630"), SKColor.Parse("#998DD9"), SKColor.Parse("#00B8D9"),
        SKColor.Parse("#79E2F2"), SKColor.Parse("#C1C7D0")
    };

    private readonly PortfolioService _portfolioService;

    [ObservableProperty] private decimal _totalMarketValue;
    [ObservableProperty] private decimal _totalCostBasis;
    [ObservableProperty] private decimal _totalUnrealizedPnL;
    [ObservableProperty] private decimal _totalRealizedPnL;
    [ObservableProperty] private decimal _totalPnL;
    [ObservableProperty] private double _totalPnLPct;
    [ObservableProperty] private int _openPositionCount;
    [ObservableProperty] private double _winRate;

    public ObservableCollection<Position> Positions { get; } = new();
    public ISeries[] AllocationSeries { get; private set; } = Array.Empty<ISeries>();
    public ISeries[] EquitySeries { get; private set; } = Array.Empty<ISeries>();
    public Axis[] EquityXAxes { get; private set; } = Array.Empty<Axis>();

    public DashboardViewModel(PortfolioService portfolioService)
    {
        _portfolioService = portfolioService;
        _portfolioService.DataChanged += Refresh;
        Refresh();
    }

    /// <summary>Called when the user edits the "Current Price" cell in the positions grid.</summary>
    public void UpdatePrice(Position position)
    {
        _portfolioService.SetPrice(position.Symbol, position.CurrentPrice);
    }

    public void Refresh()
    {
        var positions = _portfolioService.GetPositions();

        Positions.Clear();
        foreach (var position in positions.Where(p => Math.Abs(p.Quantity) > 0.0000001m))
        {
            Positions.Add(position);
        }

        TotalMarketValue = positions.Sum(p => p.MarketValue);
        TotalCostBasis = positions.Sum(p => p.CostBasis);
        TotalUnrealizedPnL = positions.Sum(p => p.UnrealizedPnL);
        TotalRealizedPnL = positions.Sum(p => p.RealizedPnL);
        TotalPnL = TotalUnrealizedPnL + TotalRealizedPnL;
        TotalPnLPct = TotalCostBasis != 0 ? (double)(TotalUnrealizedPnL / TotalCostBasis) : 0;
        OpenPositionCount = Positions.Count;

        WinRate = ComputeWinRate();

        BuildAllocationSeries();
        BuildEquitySeries();

        OnPropertyChanged(nameof(AllocationSeries));
        OnPropertyChanged(nameof(EquitySeries));
        OnPropertyChanged(nameof(EquityXAxes));
    }

    private double ComputeWinRate()
    {
        var equityCurve = _portfolioService.GetEquityCurve();
        if (equityCurve.Count < 2)
        {
            return 0;
        }

        var wins = 0;
        var total = 0;
        for (var i = 1; i < equityCurve.Count; i++)
        {
            total++;
            if (equityCurve[i].CumulativeRealizedPnL > equityCurve[i - 1].CumulativeRealizedPnL)
            {
                wins++;
            }
        }

        return total == 0 ? 0 : (double)wins / total;
    }

    private void BuildAllocationSeries()
    {
        var series = new List<ISeries>();
        for (var i = 0; i < Positions.Count; i++)
        {
            var position = Positions[i];
            var color = Palette[i % Palette.Length];

            series.Add(new PieSeries<double>
            {
                Values = new[] { (double)position.MarketValue },
                Name = position.Symbol,
                Fill = new SolidColorPaint(color),
                DataLabelsPaint = new SolidColorPaint(SKColors.White),
                DataLabelsSize = 12,
                ToolTipLabelFormatter = point => $"{position.Symbol}: {point.Coordinate.PrimaryValue:C0} ({position.AllocationPct:P1})"
            });
        }

        AllocationSeries = series.ToArray();
    }

    private void BuildEquitySeries()
    {
        var points = _portfolioService.GetEquityCurve();

        EquitySeries = new ISeries[]
        {
            new LineSeries<decimal>
            {
                Values = points.Select(p => p.CumulativeRealizedPnL).ToArray(),
                Name = "Realized P&L",
                Stroke = new SolidColorPaint(SKColor.Parse("#4C9AFF"), 3),
                Fill = new SolidColorPaint(SKColor.Parse("#264C9AFF")),
                GeometrySize = 4,
                GeometryStroke = new SolidColorPaint(SKColor.Parse("#4C9AFF"), 2)
            }
        };

        EquityXAxes = new[]
        {
            new Axis
            {
                Labels = points.Select(p => p.Date.ToString("MM/dd")).ToArray(),
                LabelsPaint = new SolidColorPaint(SKColor.Parse("#C1C7D0")),
                TextSize = 11
            }
        };
    }
}
