using System.Text;
using System.Text.Json;
using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Backtesting;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.MarketDataProviders;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.SignalEngine.Confidence;
using FlexXSignal.SignalEngine.Engine;
using FlexXSignal.SignalEngine.Filters;
using FlexXSignal.SignalEngine.Models;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Services;

public sealed class BacktestService : IBacktestService
{
    private readonly AppDbContext _db;
    private readonly IDateTimeProvider _clock;
    private readonly SignalEngineOrchestrator _orchestrator;
    private readonly CsvMarketDataProvider _csvProvider;

    public BacktestService(AppDbContext db, IDateTimeProvider clock, SignalEngineOrchestrator orchestrator, CsvMarketDataProvider csvProvider)
    {
        _db = db;
        _clock = clock;
        _orchestrator = orchestrator;
        _csvProvider = csvProvider;
    }

    public async Task<Result<Guid>> QueueBacktestAsync(RunBacktestRequest request, Guid userId, CancellationToken ct = default)
    {
        var pair = await _db.TradingPairs.FirstOrDefaultAsync(p => p.Id == request.TradingPairId, ct);
        if (pair is null) return Result<Guid>.Failure("Trading pair not found.");

        var strategyVersion = await _db.StrategyVersions.Include(v => v.Strategy).Include(v => v.Parameters).FirstOrDefaultAsync(v => v.Id == request.StrategyVersionId, ct);
        if (strategyVersion is null) return Result<Guid>.Failure("Strategy version not found.");

        var settingsSnapshot = JsonSerializer.Serialize(new
        {
            strategyVersion.WeightTrendAlignment, strategyVersion.WeightMarketStructure, strategyVersion.WeightCandlePressure,
            strategyVersion.WeightMomentum, strategyVersion.WeightSupportResistance, strategyVersion.WeightBreakoutRejection,
            strategyVersion.WeightMultiTimeframeAgreement, strategyVersion.WeightVolatilityQuality, strategyVersion.WeightHistoricalPerformance,
            ConfidenceThreshold = request.ConfidenceThresholdOverride,
            Parameters = request.ParameterOverrides ?? strategyVersion.Parameters.ToDictionary(p => p.Key, p => p.Value)
        });

        var backtest = new Backtest
        {
            Name = request.Name,
            TradingPairId = pair.Id,
            Timeframe = request.Timeframe,
            StrategyVersionId = strategyVersion.Id,
            Duration = request.Duration,
            InSampleStartUtc = request.InSampleStartUtc,
            InSampleEndUtc = request.InSampleEndUtc,
            OutOfSampleStartUtc = request.OutOfSampleStartUtc,
            OutOfSampleEndUtc = request.OutOfSampleEndUtc,
            WalkForwardEnabled = request.WalkForwardEnabled,
            WalkForwardFolds = Math.Max(1, request.WalkForwardFolds),
            ConfidenceThresholdOverride = request.ConfidenceThresholdOverride,
            StrategySettingsSnapshotJson = settingsSnapshot,
            SourceCsvFileName = request.CsvFileName ?? string.Empty,
            Status = BacktestStatus.Queued,
            CreatedByUserId = userId
        };

        _db.Backtests.Add(backtest);
        await _db.SaveChangesAsync(ct);

        if (request.CsvStream is not null)
        {
            await _csvProvider.ImportAsync(request.CsvStream, ct);
        }

        await RunQueuedBacktestAsync(backtest.Id, ct);
        return Result<Guid>.Success(backtest.Id);
    }

    public async Task RunQueuedBacktestAsync(Guid backtestId, CancellationToken ct = default)
    {
        var backtest = await _db.Backtests
            .Include(b => b.TradingPair)
            .Include(b => b.StrategyVersion).ThenInclude(v => v!.Strategy)
            .Include(b => b.StrategyVersion).ThenInclude(v => v!.Parameters)
            .FirstOrDefaultAsync(b => b.Id == backtestId, ct);
        if (backtest is null) return;

        backtest.Status = BacktestStatus.Running;
        await _db.SaveChangesAsync(ct);

        try
        {
            var strategy = _orchestrator.AvailableStrategies.FirstOrDefault(s => s.Key == backtest.StrategyVersion!.Strategy!.Key);
            if (strategy is null) throw new InvalidOperationException($"No strategy engine registered for key '{backtest.StrategyVersion!.Strategy!.Key}'.");

            var rangeEnd = backtest.OutOfSampleEndUtc ?? backtest.InSampleEndUtc;
            var candles = await _db.Candles.AsNoTracking()
                .Where(c => c.TradingPairId == backtest.TradingPairId && c.Timeframe == backtest.Timeframe
                            && c.OpenTimeUtc >= backtest.InSampleStartUtc && c.OpenTimeUtc <= rangeEnd)
                .OrderBy(c => c.OpenTimeUtc)
                .ToListAsync(ct);

            if (candles.Count < strategy.MinimumCandlesRequired + 2)
            {
                backtest.Status = BacktestStatus.Failed;
                backtest.ErrorMessage = $"Not enough historical candles ({candles.Count}) for this pair/timeframe/date range. Import CSV data first.";
                await _db.SaveChangesAsync(ct);
                return;
            }

            var engineCandles = candles.Select(c => new CandleData
            {
                OpenTimeUtc = c.OpenTimeUtc, CloseTimeUtc = c.CloseTimeUtc, Open = c.Open, High = c.High, Low = c.Low, Close = c.Close, Volume = c.Volume
            }).ToList();

            var strategyVersion = backtest.StrategyVersion!;
            var weights = new ConfidenceWeights
            {
                TrendAlignment = strategyVersion.WeightTrendAlignment,
                MarketStructure = strategyVersion.WeightMarketStructure,
                CandlePressure = strategyVersion.WeightCandlePressure,
                Momentum = strategyVersion.WeightMomentum,
                SupportResistance = strategyVersion.WeightSupportResistance,
                BreakoutRejection = strategyVersion.WeightBreakoutRejection,
                MultiTimeframeAgreement = strategyVersion.WeightMultiTimeframeAgreement,
                VolatilityQuality = strategyVersion.WeightVolatilityQuality,
                HistoricalPerformance = strategyVersion.WeightHistoricalPerformance
            };
            var parameters = strategyVersion.Parameters.ToDictionary(p => p.Key, p => p.Value);
            var expirationOffset = Math.Max(1, (int)backtest.Duration / (int)backtest.Timeframe);
            var minimumConfidence = backtest.ConfidenceThresholdOverride > 0 ? backtest.ConfidenceThresholdOverride : strategyVersion.MinimumPublishConfidence;

            var trades = new List<BacktestTrade>();
            var i = strategy.MinimumCandlesRequired - 1;
            const int contextWindow = 250;

            while (i < engineCandles.Count - expirationOffset - 1)
            {
                // No-look-ahead guarantee: only candles up to and including index `i` (all closed strictly
                // before the entry candle opens) are ever passed into the strategy context.
                var windowStart = Math.Max(0, i - contextWindow);
                var window = engineCandles.GetRange(windowStart, i - windowStart + 1);
                var entryCandle = engineCandles[i + 1];
                var expirationIndex = i + 1 + expirationOffset;
                if (expirationIndex >= engineCandles.Count) break;
                var expirationCandle = engineCandles[expirationIndex];

                var context = new StrategyContext
                {
                    PairSymbol = backtest.TradingPair!.Symbol,
                    MarketType = backtest.TradingPair.MarketType,
                    ExecutionTimeframe = backtest.Timeframe,
                    ExecutionCandles = window,
                    HigherTimeframeCandles = Array.Empty<CandleData>(),
                    EvaluationTimeUtc = entryCandle.OpenTimeUtc,
                    ProposedExpiration = backtest.Duration,
                    Parameters = parameters,
                    HistoricalWinRatePercent = 50m,
                    DataQuality = DataQualityStatus.Good
                };

                var env = new NoTradeEnvironment
                {
                    StrategyEnabled = true,
                    ProviderConnected = true,
                    SignalsPublishedThisHour = 0,
                    MaxSignalsPerHour = 999,
                    DailyRealizedLossPercent = 0,
                    DailyLossLimitPercent = 100,
                    TimeUntilEntry = TimeSpan.FromMinutes(5),
                    MinimumTimeBeforeEntry = TimeSpan.Zero,
                    RequiresHigherTimeframeData = false,
                    HasHigherTimeframeData = true
                };

                var outcome = _orchestrator.Evaluate(strategy.Key, context, weights, minimumConfidence, null, env);

                if (outcome.Published)
                {
                    var direction = outcome.StrategyResult.Direction == StrategyDirectionVote.Up ? SignalDirection.Up : SignalDirection.Down;
                    var isWin = direction == SignalDirection.Up ? expirationCandle.Close > entryCandle.Open : expirationCandle.Close < entryCandle.Open;
                    var isTie = expirationCandle.Close == entryCandle.Open;
                    var result = isTie ? SignalStatus.Tie : isWin ? SignalStatus.Win : SignalStatus.Loss;
                    var isOutOfSample = backtest.OutOfSampleStartUtc.HasValue && entryCandle.OpenTimeUtc >= backtest.OutOfSampleStartUtc;

                    trades.Add(new BacktestTrade
                    {
                        BacktestId = backtest.Id,
                        EntryTimeUtc = entryCandle.OpenTimeUtc,
                        ExpirationTimeUtc = expirationCandle.CloseTimeUtc,
                        Direction = direction,
                        EntryPrice = entryCandle.Open,
                        ExpirationPrice = expirationCandle.Close,
                        ConfidencePercent = outcome.CalibratedConfidence,
                        MarketCondition = outcome.StrategyResult.MarketCondition,
                        Outcome = result,
                        IsOutOfSample = isOutOfSample,
                        WalkForwardFoldIndex = ComputeFoldIndex(backtest, entryCandle.OpenTimeUtc)
                    });

                    // Advance past this trade's expiration before evaluating the next one, mirroring live one-at-a-time execution.
                    i = expirationIndex;
                }
                else
                {
                    i++;
                }
            }

            _db.BacktestTrades.AddRange(trades);
            var metrics = ComputeMetrics(backtest.Id, trades);
            _db.BacktestMetrics.AddRange(metrics);

            backtest.Status = BacktestStatus.Completed;
            backtest.CompletedAtUtc = _clock.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            backtest.Status = BacktestStatus.Failed;
            backtest.ErrorMessage = ex.Message;
            await _db.SaveChangesAsync(ct);
        }
    }

    private static int ComputeFoldIndex(Backtest backtest, DateTime timeUtc)
    {
        if (!backtest.WalkForwardEnabled || backtest.WalkForwardFolds <= 1) return 0;
        var totalTicks = (backtest.InSampleEndUtc - backtest.InSampleStartUtc).Ticks;
        if (totalTicks <= 0) return 0;
        var elapsed = (timeUtc - backtest.InSampleStartUtc).Ticks;
        var fold = (int)(elapsed * backtest.WalkForwardFolds / totalTicks);
        return Math.Clamp(fold, 0, backtest.WalkForwardFolds - 1);
    }

    private static List<BacktestMetric> ComputeMetrics(Guid backtestId, List<BacktestTrade> trades)
    {
        var metrics = new List<BacktestMetric>();

        BacktestMetric Metric(string category, string key, object payload) => new()
        {
            BacktestId = backtestId,
            Category = category,
            Key = key,
            MetricsJson = JsonSerializer.Serialize(payload)
        };

        int wins = trades.Count(t => t.Outcome == SignalStatus.Win);
        int losses = trades.Count(t => t.Outcome == SignalStatus.Loss);
        int ties = trades.Count(t => t.Outcome == SignalStatus.Tie);
        var winRate = trades.Count == 0 ? 0 : Math.Round(100m * wins / trades.Count, 2);

        metrics.Add(Metric("Overall", "summary", new
        {
            Total = trades.Count,
            Wins = wins,
            Losses = losses,
            Ties = ties,
            WinRate = winRate,
            LossRate = trades.Count == 0 ? 0 : Math.Round(100m * losses / trades.Count, 2),
            AverageConfidence = trades.Count == 0 ? 0 : Math.Round(trades.Average(t => t.ConfidencePercent), 2),
            MaxWinningStreak = MaxStreak(trades, SignalStatus.Win),
            MaxLosingStreak = MaxStreak(trades, SignalStatus.Loss)
        }));

        foreach (var g in trades.GroupBy(t => t.EntryTimeUtc.Hour))
            metrics.Add(Metric("ByHour", g.Key.ToString("00"), Summarize(g.ToList())));

        foreach (var g in trades.GroupBy(t => t.EntryTimeUtc.DayOfWeek))
            metrics.Add(Metric("ByDay", g.Key.ToString(), Summarize(g.ToList())));

        foreach (var g in trades.GroupBy(t => t.Direction))
            metrics.Add(Metric("ByDirection", g.Key.ToString(), Summarize(g.ToList())));

        foreach (var g in trades.GroupBy(t => t.MarketCondition))
            metrics.Add(Metric("ByMarketCondition", g.Key.ToString(), Summarize(g.ToList())));

        foreach (var band in ConfidenceCalculator.CalibrationBands)
        {
            var inBand = trades.Where(t => t.ConfidencePercent >= band.Min && t.ConfidencePercent <= band.Max).ToList();
            if (inBand.Count > 0) metrics.Add(Metric("ByConfidenceRange", band.Label, Summarize(inBand)));
        }

        // Equity curve: +1 unit per win, -1 per loss, 0 per tie, in chronological order.
        decimal equity = 0, peak = 0, maxDrawdown = 0;
        var equityPoints = new List<object>();
        foreach (var t in trades.OrderBy(t => t.EntryTimeUtc))
        {
            equity += t.Outcome == SignalStatus.Win ? 1 : t.Outcome == SignalStatus.Loss ? -1 : 0;
            peak = Math.Max(peak, equity);
            maxDrawdown = Math.Max(maxDrawdown, peak - equity);
            equityPoints.Add(new { t.EntryTimeUtc, Equity = equity });
        }
        metrics.Add(Metric("Equity", "curve", equityPoints));
        metrics.Add(Metric("Drawdown", "max", new { MaxDrawdownUnits = maxDrawdown }));

        return metrics;
    }

    private static object Summarize(List<BacktestTrade> trades)
    {
        var wins = trades.Count(t => t.Outcome == SignalStatus.Win);
        return new
        {
            Total = trades.Count,
            Wins = wins,
            Losses = trades.Count(t => t.Outcome == SignalStatus.Loss),
            Ties = trades.Count(t => t.Outcome == SignalStatus.Tie),
            WinRate = trades.Count == 0 ? 0 : Math.Round(100m * wins / trades.Count, 2)
        };
    }

    private static int MaxStreak(List<BacktestTrade> trades, SignalStatus outcome)
    {
        var max = 0;
        var current = 0;
        foreach (var t in trades.OrderBy(t => t.EntryTimeUtc))
        {
            if (t.Outcome == outcome) { current++; max = Math.Max(max, current); }
            else current = 0;
        }
        return max;
    }

    public async Task<Result<BacktestResultDto>> GetResultAsync(Guid backtestId, CancellationToken ct = default)
    {
        var backtest = await _db.Backtests.AsNoTracking()
            .Include(b => b.Trades)
            .Include(b => b.Metrics)
            .FirstOrDefaultAsync(b => b.Id == backtestId, ct);
        if (backtest is null) return Result<BacktestResultDto>.Failure("Backtest not found.");

        BacktestSummaryDto? summary = null;
        var overall = backtest.Metrics.FirstOrDefault(m => m.Category == "Overall");
        if (overall is not null)
        {
            var parsed = JsonSerializer.Deserialize<JsonElement>(overall.MetricsJson);
            summary = new BacktestSummaryDto(
                parsed.GetProperty("Total").GetInt32(), parsed.GetProperty("Wins").GetInt32(), parsed.GetProperty("Losses").GetInt32(),
                parsed.GetProperty("Ties").GetInt32(), 0, parsed.GetProperty("WinRate").GetDecimal(), parsed.GetProperty("LossRate").GetDecimal(),
                parsed.GetProperty("AverageConfidence").GetDecimal(), parsed.GetProperty("MaxWinningStreak").GetInt32(),
                parsed.GetProperty("MaxLosingStreak").GetInt32(), 0);
        }

        var dto = new BacktestResultDto(
            backtest.Id, backtest.Name, backtest.Status, backtest.ErrorMessage, summary,
            backtest.Metrics.Select(m => new BacktestMetricDto(m.Category, m.Key, m.MetricsJson)).ToList(),
            backtest.Trades.OrderBy(t => t.EntryTimeUtc).Select(t => new BacktestTradeDto(
                t.EntryTimeUtc, t.ExpirationTimeUtc, t.Direction, t.EntryPrice, t.ExpirationPrice, t.ConfidencePercent,
                t.MarketCondition, t.Outcome, t.IsOutOfSample)).ToList());

        return Result<BacktestResultDto>.Success(dto);
    }

    public async Task<Result<IReadOnlyList<BacktestListItemDto>>> GetHistoryAsync(Guid? userId, CancellationToken ct = default)
    {
        var query = _db.Backtests.AsNoTracking().Include(b => b.Metrics).AsQueryable();
        if (userId.HasValue) query = query.Where(b => b.CreatedByUserId == userId);

        var backtests = await query.OrderByDescending(b => b.CreatedAtUtc).ToListAsync(ct);
        var items = backtests.Select(b =>
        {
            decimal? winRate = null;
            var overall = b.Metrics.FirstOrDefault(m => m.Category == "Overall");
            if (overall is not null)
            {
                var parsed = JsonSerializer.Deserialize<JsonElement>(overall.MetricsJson);
                if (parsed.TryGetProperty("WinRate", out var wr)) winRate = wr.GetDecimal();
            }
            return new BacktestListItemDto(b.Id, b.Name, b.Status, b.CreatedAtUtc, b.CompletedAtUtc, winRate);
        }).ToList();

        return Result<IReadOnlyList<BacktestListItemDto>>.Success(items);
    }

    public async Task<Result<string>> ExportResultCsvAsync(Guid backtestId, CancellationToken ct = default)
    {
        var result = await GetResultAsync(backtestId, ct);
        if (!result.Succeeded) return Result<string>.Failure(result.Errors);

        var sb = new StringBuilder();
        sb.AppendLine("EntryTimeUtc,ExpirationTimeUtc,Direction,EntryPrice,ExpirationPrice,Confidence,MarketCondition,Outcome,OutOfSample");
        foreach (var t in result.Value!.Trades)
            sb.AppendLine($"{t.EntryTimeUtc:O},{t.ExpirationTimeUtc:O},{t.Direction},{t.EntryPrice},{t.ExpirationPrice},{t.ConfidencePercent},{t.MarketCondition},{t.Outcome},{t.IsOutOfSample}");

        return Result<string>.Success(sb.ToString());
    }
}
