using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using FXVolumeTrader.Core.Enums;
using FXVolumeTrader.Core.Interfaces;
using FXVolumeTrader.Core.MarketData;
using FXVolumeTrader.Core.Models;
using LiveChartsCore;
using LiveChartsCore.Defaults;
using LiveChartsCore.SkiaSharpView;
using LiveChartsCore.SkiaSharpView.Painting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SkiaSharp;

namespace FXVolumeTrader.App.ViewModels;

/// <summary>
/// Backing view model for the main dashboard. Start Analysis connects the
/// active IMarketDataProvider, streams ticks through a FeedHealthMonitor
/// and a CandleBuilder, and renders the selected timeframe's candles and
/// tick volume live. Signal generation itself (CALL/PUT confidence,
/// market structure, indicators) is still Phase 3 - this phase proves the
/// data pipeline end to end.
/// </summary>
public sealed partial class DashboardViewModel : ViewModelBase
{
    private const int MaxVisibleCandles = 90;

    private readonly ILogger<DashboardViewModel> _logger;
    private readonly IMarketDataProvider _marketDataProvider;
    private readonly FeedHealthMonitorOptions _feedHealthOptions;

    private readonly List<DateTime> _candleTimestamps = new();
    private readonly ObservableCollection<FinancialPointI> _candlePoints = new();
    private readonly ObservableCollection<double> _volumePoints = new();

    private CancellationTokenSource? _analysisCts;
    private CandleBuilder? _candleBuilder;
    private FeedHealthMonitor? _feedHealthMonitor;

    public DashboardViewModel(
        ILogger<DashboardViewModel> logger,
        IMarketDataProvider marketDataProvider,
        IOptions<FeedHealthMonitorOptions> feedHealthOptions)
    {
        _logger = logger;
        _marketDataProvider = marketDataProvider;
        _feedHealthOptions = feedHealthOptions.Value;

        SeedPlaceholderChartData();

        CandleSeries = new ObservableCollection<ISeries>
        {
            new CandlesticksSeries<FinancialPointI>
            {
                Values = _candlePoints,
                UpFill = new SolidColorPaint(new SKColor(0x1F, 0xB8, 0x74)),
                UpStroke = new SolidColorPaint(new SKColor(0x1F, 0xB8, 0x74)),
                DownFill = new SolidColorPaint(new SKColor(0xE5, 0x48, 0x4D)),
                DownStroke = new SolidColorPaint(new SKColor(0xE5, 0x48, 0x4D))
            }
        };

        VolumeSeries = new ObservableCollection<ISeries>
        {
            new ColumnSeries<double>
            {
                Values = _volumePoints,
                Fill = new SolidColorPaint(new SKColor(0x3D, 0x8B, 0xFD)),
                MaxBarWidth = 18
            }
        };

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

    partial void OnSelectedTimeframeChanged(TimeframeType value)
    {
        // Only the selected timeframe's history is rendered - switching
        // timeframes mid-session starts a fresh visible window rather than
        // mixing candles from two different bucket sizes on one chart.
        ResetChartSeries();
    }

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
    private Task StartAnalysis()
    {
        IsAnalysisRunning = true;
        ConnectionStatus = ConnectionStatus.Connecting;
        SignalExplanation = "Analysis started. Waiting for a healthy data feed and enough candles to evaluate.";
        _logger.LogInformation("Analysis started by user for {Asset}", CurrentAsset);

        _candleBuilder = new CandleBuilder(CurrentAsset);
        _candleBuilder.CandleClosed += OnCandleClosed;
        _feedHealthMonitor = new FeedHealthMonitor(_feedHealthOptions);
        ResetChartSeries();

        _analysisCts = new CancellationTokenSource();
        StartAnalysisCommand.NotifyCanExecuteChanged();
        StopAnalysisCommand.NotifyCanExecuteChanged();

        // Runs until Stop Analysis / Emergency Stop cancels the token; the
        // command itself returns immediately so the UI stays responsive.
        _ = RunFeedLoopAsync(_analysisCts.Token);
        return Task.CompletedTask;
    }

    private bool CanStartAnalysis() => !IsAnalysisRunning && !IsEmergencyStopActive;

    [RelayCommand(CanExecute = nameof(CanStopAnalysis))]
    private void StopAnalysis()
    {
        _analysisCts?.Cancel();
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
        _analysisCts?.Cancel();
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

    // ---- Live feed pipeline ----

    private async Task RunFeedLoopAsync(CancellationToken token)
    {
        try
        {
            await _marketDataProvider.ConnectAsync(token);
            ConnectionStatus = ConnectionStatus.Connected;

            await foreach (var tick in _marketDataProvider.StreamTicksAsync(CurrentAsset, token))
            {
                ProcessTick(tick);
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when Stop Analysis / Emergency Stop cancels the token.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Market data feed loop failed for {Asset}", CurrentAsset);
            ConnectionStatus = ConnectionStatus.Faulted;
            SignalExplanation = "The data feed encountered an error and stopped. Check Application Logs for details.";
            IsAnalysisRunning = false;
            StartAnalysisCommand.NotifyCanExecuteChanged();
            StopAnalysisCommand.NotifyCanExecuteChanged();
        }
        finally
        {
            _feedHealthMonitor?.MarkDisconnected();
            await _marketDataProvider.DisconnectAsync();
        }
    }

    private void ProcessTick(Tick tick)
    {
        var anomalies = _feedHealthMonitor?.Evaluate(tick) ?? Array.Empty<TickAnomaly>();
        if (_feedHealthMonitor is not null)
        {
            ConnectionStatus = _feedHealthMonitor.Status;
        }

        foreach (var anomaly in anomalies)
        {
            _logger.LogWarning("Feed anomaly [{Type}]: {Message}", anomaly.Type, anomaly.Message);
        }

        CurrentPrice = tick.Last;

        _candleBuilder?.ApplyTick(tick);
        UpdateChartFromOpenCandle();
    }

    private void OnCandleClosed(object? sender, CandleClosedEventArgs e)
    {
        _logger.LogDebug(
            "Candle closed: {Timeframe} {Start:HH:mm:ss} O={Open} H={High} L={Low} C={Close} Vol={Volume}",
            e.Timeframe, e.Candle.StartTimeUtc, e.Candle.Open, e.Candle.High, e.Candle.Low, e.Candle.Close, e.Candle.TickVolume);
    }

    private void UpdateChartFromOpenCandle()
    {
        if (_candleBuilder is null || !_candleBuilder.OpenCandles.TryGetValue(SelectedTimeframe, out var candle))
        {
            return;
        }

        var point = new FinancialPointI((double)candle.High, (double)candle.Open, (double)candle.Close, (double)candle.Low);
        var volume = (double)candle.TickVolume;

        var isSameOpenCandle = _candleTimestamps.Count > 0 && _candleTimestamps[^1] == candle.StartTimeUtc;
        if (isSameOpenCandle)
        {
            _candlePoints[^1] = point;
            _volumePoints[^1] = volume;
        }
        else
        {
            _candlePoints.Add(point);
            _volumePoints.Add(volume);
            _candleTimestamps.Add(candle.StartTimeUtc);

            while (_candlePoints.Count > MaxVisibleCandles)
            {
                _candlePoints.RemoveAt(0);
                _volumePoints.RemoveAt(0);
                _candleTimestamps.RemoveAt(0);
            }
        }
    }

    private void ResetChartSeries()
    {
        _candlePoints.Clear();
        _volumePoints.Clear();
        _candleTimestamps.Clear();
    }

    private void SeedPlaceholderChartData()
    {
        var start = DateTime.UtcNow.AddMinutes(-10);
        var price = (double)CurrentPrice;
        var random = new Random(42);

        for (var i = 0; i < 10; i++)
        {
            var open = price;
            var close = open + (random.NextDouble() - 0.5) * 0.0006;
            var high = Math.Max(open, close) + random.NextDouble() * 0.0003;
            var low = Math.Min(open, close) - random.NextDouble() * 0.0003;

            _candlePoints.Add(new FinancialPointI(high, open, close, low));
            _volumePoints.Add(random.Next(20, 200));
            _candleTimestamps.Add(start.AddMinutes(i));

            price = close;
        }
    }
}
