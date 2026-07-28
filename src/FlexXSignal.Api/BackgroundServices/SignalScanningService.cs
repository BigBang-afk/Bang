using System.Text.Json;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Notifications;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.MarketDataProviders;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.SignalEngine.Confidence;
using FlexXSignal.SignalEngine.Engine;
using FlexXSignal.SignalEngine.Filters;
using FlexXSignal.SignalEngine.Models;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Api.BackgroundServices;

/// <summary>
/// The heart of the automatic signal engine: for every active trading pair and every enabled
/// strategy, evaluates the strategy against recent candles, applies the no-trade filter pipeline,
/// and publishes a Scheduled signal only when every gate passes. Never fabricates a signal and never
/// edits a published one's underlying analysis after the fact.
/// </summary>
public sealed class SignalScanningService : TimedBackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private static readonly TimeSpan EntryLeadTime = TimeSpan.FromSeconds(75);
    protected override TimeSpan Interval => TimeSpan.FromSeconds(20);

    public SignalScanningService(IServiceScopeFactory scopeFactory, ILogger<SignalScanningService> logger) : base(logger) =>
        _scopeFactory = scopeFactory;

    protected override async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var resolver = scope.ServiceProvider.GetRequiredService<IMarketDataProviderResolver>();
        var orchestrator = scope.ServiceProvider.GetRequiredService<SignalEngineOrchestrator>();
        var realtime = scope.ServiceProvider.GetRequiredService<ISignalRealtimeNotifier>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var clock = scope.ServiceProvider.GetRequiredService<IDateTimeProvider>();

        var provider = await resolver.GetActiveProviderAsync(ct);
        var providerConnected = provider.GetConnectionStatus() == ProviderConnectionStatus.Connected;

        var pairs = await db.TradingPairs.AsNoTracking().Where(p => p.IsActive).ToListAsync(ct);
        var strategies = await db.Strategies.Include(s => s.Versions).ThenInclude(v => v.Parameters).Where(s => s.Status == StrategyStatus.Enabled).ToListAsync(ct);
        var now = clock.UtcNow;
        var hourAgo = now.AddHours(-1);
        var todayStart = now.Date;

        foreach (var pair in pairs)
        {
            var executionCandles = await LoadCandlesAsync(db, pair.Id, Timeframe.Minute1, 260, ct);
            if (executionCandles.Count < 30) continue;

            var higherTimeframeCandles = await LoadCandlesAsync(db, pair.Id, Timeframe.Minutes5, 60, ct);

            foreach (var strategy in strategies)
            {
                var version = strategy.Versions.FirstOrDefault(v => v.IsActive);
                if (version is null) continue;

                var strategyImpl = orchestrator.AvailableStrategies.FirstOrDefault(s => s.Key == strategy.Key);
                if (strategyImpl is null || executionCandles.Count < strategyImpl.MinimumCandlesRequired) continue;

                var hasPendingSignal = await db.Signals.AnyAsync(s =>
                    s.TradingPairId == pair.Id && s.StrategyVersionId == version.Id &&
                    (s.Status == SignalStatus.Draft || s.Status == SignalStatus.Scheduled || s.Status == SignalStatus.Waiting || s.Status == SignalStatus.Active) &&
                    s.EntryTimeUtc > now.AddMinutes(-2), ct);
                if (hasPendingSignal) continue;

                var signalsThisHour = await db.Signals.CountAsync(s => s.StrategyVersionId == version.Id && s.SignalCreatedAtUtc >= hourAgo, ct);

                var todaysResults = await db.Signals.Include(s => s.Result)
                    .Where(s => s.StrategyVersionId == version.Id && s.EntryTimeUtc >= todayStart && s.Result != null)
                    .Select(s => s.Result!.Outcome)
                    .ToListAsync(ct);
                var dailyLossPercent = todaysResults.Count == 0 ? 0 : 100m * todaysResults.Count(o => o == SignalStatus.Loss) / todaysResults.Count;

                var historicalWinRate = await ComputeHistoricalWinRateAsync(db, version.Id, ct);

                var context = new StrategyContext
                {
                    PairSymbol = pair.Symbol,
                    MarketType = pair.MarketType,
                    ExecutionTimeframe = Timeframe.Minute1,
                    ExecutionCandles = executionCandles,
                    HigherTimeframeCandles = higherTimeframeCandles,
                    EvaluationTimeUtc = now,
                    ProposedExpiration = ExpirationDuration.Minute1,
                    Parameters = version.Parameters.ToDictionary(p => p.Key, p => p.Value),
                    HistoricalWinRatePercent = historicalWinRate,
                    DataQuality = executionCandles[^1].CloseTimeUtc < now.AddMinutes(-3) ? DataQualityStatus.Delayed : DataQualityStatus.Good
                };

                var weights = new ConfidenceWeights
                {
                    TrendAlignment = version.WeightTrendAlignment,
                    MarketStructure = version.WeightMarketStructure,
                    CandlePressure = version.WeightCandlePressure,
                    Momentum = version.WeightMomentum,
                    SupportResistance = version.WeightSupportResistance,
                    BreakoutRejection = version.WeightBreakoutRejection,
                    MultiTimeframeAgreement = version.WeightMultiTimeframeAgreement,
                    VolatilityQuality = version.WeightVolatilityQuality,
                    HistoricalPerformance = version.WeightHistoricalPerformance
                };

                var entryTime = now.Add(EntryLeadTime);
                var env = new NoTradeEnvironment
                {
                    StrategyEnabled = strategy.Status == StrategyStatus.Enabled,
                    ProviderConnected = providerConnected,
                    SignalsPublishedThisHour = signalsThisHour,
                    MaxSignalsPerHour = strategy.MaxSignalsPerHour,
                    DailyRealizedLossPercent = dailyLossPercent,
                    DailyLossLimitPercent = strategy.DailyLossLimitPercent,
                    TimeUntilEntry = entryTime - now,
                    MinimumTimeBeforeEntry = TimeSpan.FromSeconds(5),
                    RequiresHigherTimeframeData = strategy.Key == "multi-timeframe-trend-confirmation",
                    HasHigherTimeframeData = higherTimeframeCandles.Count >= 21
                };

                var bandStats = await ComputeBandWinRateAsync(db, ct);
                var rawConfidenceEstimate = ConfidenceCalculator.CalculateRawConfidence(strategyImpl.Evaluate(context).Scores, weights);
                var band = ConfidenceCalculator.BandForConfidence(rawConfidenceEstimate);
                bandStats.TryGetValue(band, out var bandWinRate);

                var outcome = orchestrator.Evaluate(strategy.Key, context, weights, version.MinimumPublishConfidence, bandWinRate == 0 ? null : bandWinRate, env);

                if (!outcome.Published) continue;

                await PublishSignalAsync(db, realtime, notifications, pair, version, outcome, entryTime, executionCandles, provider.IsDemoData, provider.ProviderName, ct);
            }
        }
    }

    private static async Task<List<CandleData>> LoadCandlesAsync(AppDbContext db, Guid pairId, Timeframe timeframe, int count, CancellationToken ct)
    {
        var candles = await db.Candles.AsNoTracking()
            .Where(c => c.TradingPairId == pairId && c.Timeframe == timeframe && c.IsClosed)
            .OrderByDescending(c => c.OpenTimeUtc)
            .Take(count)
            .ToListAsync(ct);

        candles.Reverse();
        return candles.Select(c => new CandleData
        {
            OpenTimeUtc = c.OpenTimeUtc, CloseTimeUtc = c.CloseTimeUtc, Open = c.Open, High = c.High, Low = c.Low, Close = c.Close, Volume = c.Volume, IsClosed = c.IsClosed
        }).ToList();
    }

    private static async Task<decimal> ComputeHistoricalWinRateAsync(AppDbContext db, Guid strategyVersionId, CancellationToken ct)
    {
        var results = await db.Signals.Include(s => s.Result)
            .Where(s => s.StrategyVersionId == strategyVersionId && s.Result != null)
            .OrderByDescending(s => s.EntryTimeUtc)
            .Take(100)
            .Select(s => s.Result!.Outcome)
            .ToListAsync(ct);

        if (results.Count < 5) return 50m;
        return Math.Round(100m * results.Count(o => o == SignalStatus.Win) / results.Count, 2);
    }

    private static async Task<Dictionary<string, decimal>> ComputeBandWinRateAsync(AppDbContext db, CancellationToken ct)
    {
        var verified = await db.Signals.AsNoTracking()
            .Where(s => s.Status == SignalStatus.Win || s.Status == SignalStatus.Loss || s.Status == SignalStatus.Tie)
            .Select(s => new { s.ConfidencePercent, s.Status })
            .ToListAsync(ct);

        var result = new Dictionary<string, decimal>();
        foreach (var band in ConfidenceCalculator.CalibrationBands)
        {
            var inBand = verified.Where(s => s.ConfidencePercent >= band.Min && s.ConfidencePercent <= band.Max).ToList();
            if (inBand.Count >= 5)
                result[band.Label] = Math.Round(100m * inBand.Count(s => s.Status == SignalStatus.Win) / inBand.Count, 2);
        }
        return result;
    }

    private static async Task PublishSignalAsync(
        AppDbContext db, ISignalRealtimeNotifier realtime, INotificationService notifications,
        TradingPair pair, StrategyVersion version, SignalGenerationOutcome outcome, DateTime entryTime,
        List<CandleData> executionCandles, bool isDemo, string dataSourceName, CancellationToken ct)
    {
        var nextTradeNumber = (await db.Signals.OrderByDescending(s => s.TradeNumber).Select(s => s.TradeNumber).FirstOrDefaultAsync(ct)) + 1;
        var direction = outcome.StrategyResult.Direction == StrategyDirectionVote.Up ? SignalDirection.Up : SignalDirection.Down;

        var signal = new Signal
        {
            TradeNumber = nextTradeNumber,
            TradingPairId = pair.Id,
            StrategyVersionId = version.Id,
            Timeframe = Timeframe.Minute1,
            Duration = ExpirationDuration.Minute1,
            Direction = direction,
            Status = SignalStatus.Scheduled,
            MarketCondition = outcome.StrategyResult.MarketCondition,
            SignalCreatedAtUtc = DateTime.UtcNow,
            EntryTimeUtc = entryTime,
            ExpirationTimeUtc = entryTime.AddSeconds((int)ExpirationDuration.Minute1),
            ConfidencePercent = outcome.CalibratedConfidence,
            PayoutPercentAtCreation = pair.CurrentPayoutPercent,
            AnalysisExplanationEn = BuildExplanation(outcome, direction, isEnglish: true),
            AnalysisExplanationUr = BuildExplanation(outcome, direction, isEnglish: false),
            DataSourceName = isDemo ? $"{dataSourceName} (DEMO DATA)" : dataSourceName,
            DataQuality = DataQualityStatus.Good,
            IsManual = false
        };

        signal.Scores.Add(new SignalScore
        {
            TrendScore = outcome.StrategyResult.Scores.TrendScore,
            MarketStructureScore = outcome.StrategyResult.Scores.MarketStructureScore,
            MomentumScore = outcome.StrategyResult.Scores.MomentumScore,
            CandlePressureScore = outcome.StrategyResult.Scores.CandlePressureScore,
            SupportResistanceScore = outcome.StrategyResult.Scores.SupportResistanceScore,
            BreakoutScore = outcome.StrategyResult.Scores.BreakoutScore,
            VolatilityScore = outcome.StrategyResult.Scores.VolatilityScore,
            DataQualityScore = outcome.StrategyResult.Scores.DataQualityScore,
            HistoricalStrategyScore = outcome.StrategyResult.Scores.HistoricalStrategyScore,
            MultiTimeframeScore = outcome.StrategyResult.Scores.MultiTimeframeScore,
            FinalCalibratedConfidence = outcome.CalibratedConfidence
        });

        foreach (var reason in outcome.StrategyResult.Reasons)
        {
            signal.Reasons.Add(new SignalReason
            {
                IsSupporting = reason.IsSupporting,
                Code = reason.Code,
                Description = reason.Description,
                IndicatorsUsedCsv = string.Join(',', outcome.StrategyResult.IndicatorsUsed),
                SupportingCandleIndexesCsv = string.Join(',', outcome.StrategyResult.SupportingCandleIndexes)
            });
        }

        var snapshotCandles = executionCandles.TakeLast(60).Select(c => new { c.OpenTimeUtc, c.Open, c.High, c.Low, c.Close, c.Volume });
        signal.Snapshots.Add(new SignalSnapshot { Label = "AtCreation", CandlesJson = JsonSerializer.Serialize(snapshotCandles) });

        db.Signals.Add(signal);
        await db.SaveChangesAsync(ct);

        await realtime.NotifySignalCreatedAsync(signal.Id, ct);
        await notifications.DispatchSignalNotificationAsync(signal.Id, NotificationType.SignalCreated, ct);
    }

    private static string BuildExplanation(SignalGenerationOutcome outcome, SignalDirection direction, bool isEnglish)
    {
        var supportingReasons = outcome.StrategyResult.Reasons.Where(r => r.IsSupporting).Select(r => r.Description).ToList();
        var directionWord = direction == SignalDirection.Up ? (isEnglish ? "UP" : "UP (Upar)") : (isEnglish ? "DOWN" : "DOWN (Neeche)");

        if (isEnglish)
        {
            var body = supportingReasons.Count > 0 ? string.Join(" ", supportingReasons) : "Multiple confirming factors aligned for this setup.";
            return $"{body} Market condition: {outcome.StrategyResult.MarketCondition}. The signal engine selected {directionWord} for the next candle with a calibrated confidence of {outcome.CalibratedConfidence:F0}%. This is a High Confidence Signal, not a guaranteed outcome.";
        }

        return $"Market ka rujhan {outcome.StrategyResult.MarketCondition} hai aur signal engine ne agle candle ke liye {directionWord} intekhab kiya hai, confidence {outcome.CalibratedConfidence:F0}% ke saath. Yeh High Confidence Signal hai, guaranteed result nahi.";
    }
}
