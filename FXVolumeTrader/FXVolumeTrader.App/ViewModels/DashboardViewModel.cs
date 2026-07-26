using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using FXVolumeTrader.Core.Enums;
using LiveChartsCore;
using LiveChartsCore.Defaults;
using LiveChartsCore.SkiaSharpView;
using LiveChartsCore.SkiaSharpView.Painting;
using Microsoft.Extensions.Logging;
using SkiaSharp;

namespace FXVolumeTrader.App.ViewModels;

/// <summary>
/// Backing view model for the main dashboard. In Phase 1 this only hosts
/// the shell state (chart placeholders, default/neutral stat values, and
/// correctly wired but inert commands) - the live tick feed, candle
/// builder, and signal engine are connected in later phases without any
/// changes to this class's public surface.
/// </summary>
public sealed partial class DashboardViewModel : ViewModelBase
{
    private readonly ILogger<DashboardViewModel> _logger;
    private readonly List<DateTime> _candleTimestamps = new();

    public DashboardViewModel(ILogger<DashboardViewModel> logger)
    {
        _logger = logger;
        CandleSeries = BuildPlaceholderCandleSeries(_candleTimestamps);
        VolumeSeries = BuildPlaceholderVolumeSeries();

        CandleXAxes = new[]
        {
            new Axis
            {
                Labeler = value => value >= 0 && value < _candleTimestamps.Count
                    ? _candleTimestamps[(int)value].ToString("HH:mm:ss")
                    : string.Empty,
                MinStep = 1,
                LabelsPaint = new SolidColorPaint(new SKColor(0x8B, 0x95, 0xA5))
            }
        };
    }

    // ---- Asset / timeframe / feed state ----

    [ObservableProperty] private string _currentAsset = "EUR/USD (OTC)";

    [ObservableProperty] private decimal _currentPrice = 1.08750m;

    [ObservableProperty] private TimeframeType _selectedTimeframe = TimeframeType.Minute1;

    [ObservableProperty] private ExpiryType _selectedExpiry = ExpiryType.Minute1;

    [ObservableProperty] private ConnectionStatus _connectionStatus = ConnectionStatus.Disconnected;

    // ---- Market read ----

    [ObservableProperty] private MarketCondition _marketCondition = MarketCondition.Unknown;

    [ObservableProperty] private string _currentTrend = "Neutral";

    // ---- Signal ----

    [ObservableProperty] private SignalType _currentSignal = SignalType.NoTrade;

    [ObservableProperty] private int _callConfidence;

    [ObservableProperty] private int _putConfidence;

    [ObservableProperty]
    private string _signalExplanation =
        "Analysis is not running. Press Start Analysis to begin evaluating live candles. " +
        "No signal is ever guaranteed to be profitable.";

    [ObservableProperty] private decimal _suggestedTradeAmount = 1.00m;

    // ---- Session / risk stats ----

    [ObservableProperty] private decimal _dailyProfitLoss;

    [ObservableProperty] private decimal _winRate;

    [ObservableProperty] private int _consecutiveWins;

    [ObservableProperty] private int _consecutiveLosses;

    [ObservableProperty] private int _tradesToday;

    [ObservableProperty] private decimal _dailyLossLimit = 50.00m;

    [ObservableProperty] private bool _isAnalysisRunning;

    [ObservableProperty] private bool _isEmergencyStopActive;

    // ---- Chart series (LiveCharts2) ----

    public ObservableCollection<ISeries> CandleSeries { get; }

    public ObservableCollection<ISeries> VolumeSeries { get; }

    public Axis[] CandleXAxes { get; }

    public Axis[] CandleYAxes { get; } =
    {
        new Axis { LabelsPaint = new SolidColorPaint(new SKColor(0x8B, 0x95, 0xA5)) }
    };

    public Axis[] VolumeXAxes { get; } =
    {
        new Axis { IsVisible = false }
    };

    public Axis[] VolumeYAxes { get; } =
    {
        new Axis { LabelsPaint = new SolidColorPaint(new SKColor(0x8B, 0x95, 0xA5)) }
    };

    // ---- Commands ----

    [RelayCommand(CanExecute = nameof(CanStartAnalysis))]
    private void StartAnalysis()
    {
        IsAnalysisRunning = true;
        ConnectionStatus = ConnectionStatus.Connecting;
        SignalExplanation = "Analysis started. Waiting for a healthy data feed and enough candles to evaluate.";
        _logger.LogInformation("Analysis started by user for {Asset}", CurrentAsset);
        StartAnalysisCommand.NotifyCanExecuteChanged();
        StopAnalysisCommand.NotifyCanExecuteChanged();
    }

    private bool CanStartAnalysis() => !IsAnalysisRunning && !IsEmergencyStopActive;

    [RelayCommand(CanExecute = nameof(CanStopAnalysis))]
    private void StopAnalysis()
    {
        IsAnalysisRunning = false;
        ConnectionStatus = ConnectionStatus.Disconnected;
        SignalExplanation = "Analysis stopped.";
        _logger.LogInformation("Analysis stopped by user for {Asset}", CurrentAsset);
        StartAnalysisCommand.NotifyCanExecuteChanged();
        StopAnalysisCommand.NotifyCanExecuteChanged();
    }

    private bool CanStopAnalysis() => IsAnalysisRunning;

    [RelayCommand(CanExecute = nameof(CanConfirmSignal))]
    private void ConfirmCall()
    {
        _logger.LogInformation("User confirmed CALL for {Asset} at {Price}", CurrentAsset, CurrentPrice);
    }

    [RelayCommand(CanExecute = nameof(CanConfirmSignal))]
    private void ConfirmPut()
    {
        _logger.LogInformation("User confirmed PUT for {Asset} at {Price}", CurrentAsset, CurrentPrice);
    }

    [RelayCommand(CanExecute = nameof(CanConfirmSignal))]
    private void RejectSignal()
    {
        _logger.LogInformation("User rejected signal for {Asset}", CurrentAsset);
        CurrentSignal = SignalType.NoTrade;
    }

    private bool CanConfirmSignal() => IsAnalysisRunning && CurrentSignal != SignalType.NoTrade && !IsEmergencyStopActive;

    [RelayCommand]
    private void EmergencyStop()
    {
        IsEmergencyStopActive = true;
        IsAnalysisRunning = false;
        CurrentSignal = SignalType.NoTrade;
        ConnectionStatus = ConnectionStatus.Disconnected;
        SignalExplanation = "Emergency stop is active. No new signals will be generated until it is cleared in Risk Settings.";
        _logger.LogWarning("Emergency stop activated by user");
        StartAnalysisCommand.NotifyCanExecuteChanged();
        StopAnalysisCommand.NotifyCanExecuteChanged();
        ConfirmCallCommand.NotifyCanExecuteChanged();
        ConfirmPutCommand.NotifyCanExecuteChanged();
        RejectSignalCommand.NotifyCanExecuteChanged();
    }

    private static ObservableCollection<ISeries> BuildPlaceholderCandleSeries(List<DateTime> timestamps)
    {
        var start = DateTime.UtcNow.AddMinutes(-10);
        var points = new List<FinancialPointI>();
        var price = 1.0875;
        var random = new Random(42);

        for (var i = 0; i < 10; i++)
        {
            var open = price;
            var close = open + (random.NextDouble() - 0.5) * 0.0006;
            var high = Math.Max(open, close) + random.NextDouble() * 0.0003;
            var low = Math.Min(open, close) - random.NextDouble() * 0.0003;
            points.Add(new FinancialPointI(high, open, close, low));
            timestamps.Add(start.AddMinutes(i));
            price = close;
        }

        return new ObservableCollection<ISeries>
        {
            new CandlesticksSeries<FinancialPointI>
            {
                Values = points,
                UpFill = new SolidColorPaint(new SKColor(0x1F, 0xB8, 0x74)),
                UpStroke = new SolidColorPaint(new SKColor(0x1F, 0xB8, 0x74)),
                DownFill = new SolidColorPaint(new SKColor(0xE5, 0x48, 0x4D)),
                DownStroke = new SolidColorPaint(new SKColor(0xE5, 0x48, 0x4D))
            }
        };
    }

    private static ObservableCollection<ISeries> BuildPlaceholderVolumeSeries()
    {
        var random = new Random(7);
        var values = Enumerable.Range(0, 10).Select(_ => (double)random.Next(20, 200)).ToArray();

        return new ObservableCollection<ISeries>
        {
            new ColumnSeries<double>
            {
                Values = values,
                Fill = new SolidColorPaint(new SKColor(0x3D, 0x8B, 0xFD)),
                MaxBarWidth = 18
            }
        };
    }
}
