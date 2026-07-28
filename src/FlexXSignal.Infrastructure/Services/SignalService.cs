using System.Text;
using System.Text.Json;
using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Signals;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.SignalEngine.Confidence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Services;

public sealed class SignalService : ISignalService
{
    private readonly AppDbContext _db;
    private readonly IDateTimeProvider _clock;
    private readonly IAuditLogService _auditLog;
    private readonly SubscriptionAccessService _access;
    private readonly ISignalRealtimeNotifier _realtime;

    public SignalService(AppDbContext db, IDateTimeProvider clock, IAuditLogService auditLog, SubscriptionAccessService access, ISignalRealtimeNotifier realtime)
    {
        _db = db;
        _clock = clock;
        _auditLog = auditLog;
        _access = access;
        _realtime = realtime;
    }

    public async Task<Result<SignalDto>> GetByIdAsync(Guid signalId, Guid? requestingUserId, CancellationToken ct = default)
    {
        var signal = await LoadFullSignalQuery().FirstOrDefaultAsync(s => s.Id == signalId, ct);
        if (signal is null) return Result<SignalDto>.Failure("Signal not found.");
        return Result<SignalDto>.Success(await ToDtoAsync(signal, ct));
    }

    public async Task<Result<IReadOnlyList<SignalListItemDto>>> GetLiveAndUpcomingAsync(Guid? requestingUserId, CancellationToken ct = default)
    {
        var plan = await _access.GetEffectivePlanAsync(requestingUserId, ct);
        var delayCutoff = _clock.UtcNow.AddSeconds(-plan.SignalDelaySeconds);

        var signals = await _db.Signals.AsNoTracking()
            .Include(s => s.TradingPair)
            .Include(s => s.StrategyVersion).ThenInclude(v => v!.Strategy)
            .Where(s => s.Status == SignalStatus.Scheduled || s.Status == SignalStatus.Waiting || s.Status == SignalStatus.Active)
            .Where(s => plan.SignalDelaySeconds == 0 || s.SignalCreatedAtUtc <= delayCutoff || s.Status == SignalStatus.Active)
            .OrderBy(s => s.EntryTimeUtc)
            .ToListAsync(ct);

        var visible = signals.Where(s => SubscriptionAccessService.IsPairAllowed(plan, s.TradingPair!)).ToList();
        return Result<IReadOnlyList<SignalListItemDto>>.Success(visible.Select(ToListItemDto).ToList());
    }

    public async Task<Result<PagedResult<SignalListItemDto>>> GetHistoryAsync(Guid? requestingUserId, SignalHistoryFilter filter, CancellationToken ct = default)
    {
        var plan = await _access.GetEffectivePlanAsync(requestingUserId, ct);
        var earliestAllowed = _clock.UtcNow.AddDays(-plan.SignalHistoryDays);

        var query = _db.Signals.AsNoTracking()
            .Include(s => s.TradingPair)
            .Include(s => s.StrategyVersion).ThenInclude(v => v!.Strategy)
            .Include(s => s.Result)
            .Where(s => s.Status == SignalStatus.Win || s.Status == SignalStatus.Loss || s.Status == SignalStatus.Tie
                     || s.Status == SignalStatus.Canceled || s.Status == SignalStatus.Missed || s.Status == SignalStatus.DataError)
            .Where(s => plan.SignalHistoryDays <= 0 || s.EntryTimeUtc >= earliestAllowed)
            .AsQueryable();

        if (filter.FromUtc.HasValue) query = query.Where(s => s.EntryTimeUtc >= filter.FromUtc);
        if (filter.ToUtc.HasValue) query = query.Where(s => s.EntryTimeUtc <= filter.ToUtc);
        if (!string.IsNullOrEmpty(filter.PairSymbol)) query = query.Where(s => s.TradingPair!.Symbol == filter.PairSymbol);
        if (filter.MarketType.HasValue) query = query.Where(s => s.TradingPair!.MarketType == filter.MarketType);
        if (filter.Direction.HasValue) query = query.Where(s => s.Direction == filter.Direction);
        if (filter.Result.HasValue) query = query.Where(s => s.Status == filter.Result);
        if (!string.IsNullOrEmpty(filter.StrategyKey)) query = query.Where(s => s.StrategyVersion!.Strategy!.Key == filter.StrategyKey);
        if (filter.MinConfidence.HasValue) query = query.Where(s => s.ConfidencePercent >= filter.MinConfidence);
        if (filter.MaxConfidence.HasValue) query = query.Where(s => s.ConfidencePercent <= filter.MaxConfidence);
        if (filter.Duration.HasValue) query = query.Where(s => s.Duration == filter.Duration);
        if (filter.MarketCondition.HasValue) query = query.Where(s => s.MarketCondition == filter.MarketCondition);

        query = filter.SortBy switch
        {
            "ConfidencePercent" => filter.SortDescending ? query.OrderByDescending(s => s.ConfidencePercent) : query.OrderBy(s => s.ConfidencePercent),
            _ => filter.SortDescending ? query.OrderByDescending(s => s.EntryTimeUtc) : query.OrderBy(s => s.EntryTimeUtc)
        };

        var total = await query.CountAsync(ct);
        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 200);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        var allowedItems = items.Where(s => SubscriptionAccessService.IsPairAllowed(plan, s.TradingPair!)).Select(ToListItemDto).ToList();

        return Result<PagedResult<SignalListItemDto>>.Success(new PagedResult<SignalListItemDto>
        {
            Items = allowedItems,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<Result<SignalDto>> CreateManualSignalAsync(CreateManualSignalRequest request, Guid createdByUserId, CancellationToken ct = default)
    {
        var pair = await _db.TradingPairs.FirstOrDefaultAsync(p => p.Symbol == request.PairSymbol, ct);
        if (pair is null) return Result<SignalDto>.Failure("Trading pair not found.");

        var strategyVersion = await _db.StrategyVersions.Include(v => v.Strategy).FirstOrDefaultAsync(v => v.Id == request.StrategyVersionId, ct);
        if (strategyVersion is null) return Result<SignalDto>.Failure("Strategy version not found.");

        var nextTradeNumber = (await _db.Signals.OrderByDescending(s => s.TradeNumber).Select(s => s.TradeNumber).FirstOrDefaultAsync(ct)) + 1;

        var signal = new Signal
        {
            TradeNumber = nextTradeNumber,
            TradingPairId = pair.Id,
            StrategyVersionId = strategyVersion.Id,
            Timeframe = request.Timeframe,
            Duration = request.Duration,
            Direction = request.Direction,
            Status = SignalStatus.Scheduled,
            MarketCondition = MarketCondition.Unclear,
            SignalCreatedAtUtc = _clock.UtcNow,
            EntryTimeUtc = request.EntryTimeUtc,
            ExpirationTimeUtc = request.EntryTimeUtc.AddSeconds((int)request.Duration),
            ConfidencePercent = request.ConfidencePercent,
            PayoutPercentAtCreation = pair.CurrentPayoutPercent,
            AnalysisExplanationEn = request.AnalysisExplanationEn,
            AnalysisExplanationUr = request.AnalysisExplanationUr ?? string.Empty,
            DataSourceName = "Manual",
            DataQuality = DataQualityStatus.Good,
            IsManual = true,
            CreatedByUserId = createdByUserId
        };

        _db.Signals.Add(signal);
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(AuditAction.Create, nameof(Signal), signal.Id.ToString(), null, new { signal.TradeNumber, request.PairSymbol, request.Direction }, "Manual signal created by admin/analyst", ct);
        await _realtime.NotifySignalCreatedAsync(signal.Id, ct);

        var full = await LoadFullSignalQuery().FirstAsync(s => s.Id == signal.Id, ct);
        return Result<SignalDto>.Success(await ToDtoAsync(full, ct));
    }

    public async Task<Result> CancelSignalAsync(Guid signalId, string reason, Guid canceledByUserId, CancellationToken ct = default)
    {
        var signal = await _db.Signals.FirstOrDefaultAsync(s => s.Id == signalId, ct);
        if (signal is null) return Result.Failure("Signal not found.");
        if (signal.Status is SignalStatus.Win or SignalStatus.Loss or SignalStatus.Tie) return Result.Failure("Cannot cancel a signal that has already been verified.");

        var old = signal.Status;
        signal.Status = SignalStatus.Canceled;
        signal.CancelReason = reason;
        signal.UpdatedAtUtc = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(AuditAction.Update, nameof(Signal), signal.Id.ToString(), new { Status = old }, new { Status = SignalStatus.Canceled }, reason, ct);
        await _realtime.NotifySignalResultAsync(signal.Id, SignalStatus.Canceled, ct);
        return Result.Success();
    }

    public async Task<Result> CorrectSignalResultAsync(Guid signalId, CorrectSignalResultRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var result = await _db.SignalResults.FirstOrDefaultAsync(r => r.SignalId == signalId, ct);
        if (result is null) return Result.Failure("Signal result not found.");

        var oldOutcome = result.Outcome;
        result.CorrectedFromOutcome = oldOutcome;
        result.Outcome = request.NewOutcome;
        result.CorrectionReason = request.Reason;
        result.CorrectedByUserId = adminUserId;
        result.CorrectedAtUtc = _clock.UtcNow;
        // IsLocked remains true: the correction is recorded as an audited exception, never a silent overwrite.

        var signal = await _db.Signals.FirstOrDefaultAsync(s => s.Id == signalId, ct);
        if (signal is not null) signal.Status = request.NewOutcome;

        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(AuditAction.ManualSignalResultCorrection, nameof(SignalResult), result.Id.ToString(),
            new { Outcome = oldOutcome }, new { Outcome = request.NewOutcome }, request.Reason, ct);
        await _realtime.NotifySignalResultAsync(signalId, request.NewOutcome, ct);

        return Result.Success();
    }

    public async Task<Result<SignalStatisticsDto>> GetStatisticsAsync(Guid? requestingUserId, CancellationToken ct = default)
    {
        var now = _clock.UtcNow;
        var todayStart = now.Date;

        var verified = _db.Signals.AsNoTracking().Include(s => s.Result).Include(s => s.TradingPair)
            .Include(s => s.StrategyVersion).ThenInclude(v => v!.Strategy)
            .Where(s => s.Result != null && (s.Status == SignalStatus.Win || s.Status == SignalStatus.Loss || s.Status == SignalStatus.Tie));

        var todaySignals = await verified.Where(s => s.EntryTimeUtc >= todayStart).ToListAsync(ct);
        var last500 = await verified.OrderByDescending(s => s.EntryTimeUtc).Take(500).ToListAsync(ct);
        var last100 = last500.Take(100).ToList();
        var last20 = last500.Take(20).ToList();
        var last7d = last500.Where(s => s.EntryTimeUtc >= now.AddDays(-7)).ToList();
        var last30d = last500.Where(s => s.EntryTimeUtc >= now.AddDays(-30)).ToList();

        static decimal WinRate(List<Signal> signals) =>
            signals.Count == 0 ? 0 : Math.Round(100m * signals.Count(s => s.Status == SignalStatus.Win) / signals.Count, 2);

        var byPair = last500.GroupBy(s => s.TradingPair!.DisplayName)
            .Select(g => (Pair: g.Key, WinRate: WinRate(g.ToList()), Count: g.Count()))
            .Where(x => x.Count >= 3).ToList();
        var byStrategy = last500.GroupBy(s => s.StrategyVersion!.Strategy!.Name)
            .Select(g => (Strategy: g.Key, WinRate: WinRate(g.ToList()), Count: g.Count()))
            .Where(x => x.Count >= 3).ToList();

        var (currentStreak, maxLosingStreak) = ComputeStreaks(last500.OrderBy(s => s.EntryTimeUtc).ToList());

        var totalHealthChecks = await _db.DataHealthLogs.CountAsync(ct);
        var healthyChecks = await _db.DataHealthLogs.CountAsync(h => h.ConnectionStatus == ProviderConnectionStatus.Connected, ct);
        var uptime = totalHealthChecks == 0 ? 100m : Math.Round(100m * healthyChecks / totalHealthChecks, 2);

        var stats = new SignalStatisticsDto(
            todaySignals.Count,
            todaySignals.Count(s => s.Status == SignalStatus.Win),
            todaySignals.Count(s => s.Status == SignalStatus.Loss),
            todaySignals.Count(s => s.Status == SignalStatus.Tie),
            WinRate(todaySignals),
            WinRate(last20), WinRate(last100), WinRate(last500),
            WinRate(last7d), WinRate(last30d),
            byPair.OrderByDescending(x => x.WinRate).FirstOrDefault().Pair,
            byPair.OrderBy(x => x.WinRate).FirstOrDefault().Pair,
            byStrategy.OrderByDescending(x => x.WinRate).FirstOrDefault().Strategy,
            byStrategy.OrderBy(x => x.WinRate).FirstOrDefault().Strategy,
            maxLosingStreak,
            currentStreak,
            last500.Count == 0 ? 0 : Math.Round(last500.Average(s => s.ConfidencePercent), 2),
            uptime);

        return Result<SignalStatisticsDto>.Success(stats);
    }

    public async Task<Result<IReadOnlyList<ConfidenceBandStatDto>>> GetConfidenceCalibrationAsync(CancellationToken ct = default)
    {
        var verified = await _db.Signals.AsNoTracking()
            .Where(s => s.Status == SignalStatus.Win || s.Status == SignalStatus.Loss || s.Status == SignalStatus.Tie)
            .Select(s => new { s.ConfidencePercent, s.Status })
            .ToListAsync(ct);

        var results = ConfidenceCalculator.CalibrationBands.Select(band =>
        {
            var inBand = verified.Where(s => s.ConfidencePercent >= band.Min && s.ConfidencePercent <= band.Max).ToList();
            var wins = inBand.Count(s => s.Status == SignalStatus.Win);
            var winRate = inBand.Count == 0 ? 0 : Math.Round(100m * wins / inBand.Count, 2);
            return new ConfidenceBandStatDto(band.Label, inBand.Count, wins, winRate);
        }).ToList();

        return Result<IReadOnlyList<ConfidenceBandStatDto>>.Success(results);
    }

    public async Task<Result<string>> ExportHistoryCsvAsync(Guid? requestingUserId, SignalHistoryFilter filter, CancellationToken ct = default)
    {
        var page = await GetHistoryAsync(requestingUserId, filter with { Page = 1, PageSize = 5000 }, ct);
        if (!page.Succeeded) return Result<string>.Failure(page.Errors);

        var sb = new StringBuilder();
        sb.AppendLine("TradeNumber,Pair,Direction,Status,EntryTimeUtc,ExpirationTimeUtc,Confidence,Strategy,MarketCondition");
        foreach (var s in page.Value!.Items)
        {
            sb.AppendLine($"{s.TradeNumber},{s.PairSymbol},{s.Direction},{s.Status},{s.EntryTimeUtc:O},{s.ExpirationTimeUtc:O},{s.ConfidencePercent},{s.StrategyName},{s.MarketCondition}");
        }
        return Result<string>.Success(sb.ToString());
    }

    private static (int CurrentStreak, int MaxLosingStreak) ComputeStreaks(List<Signal> chronological)
    {
        var current = 0;
        var maxLosing = 0;
        var runningLosing = 0;

        foreach (var signal in chronological)
        {
            if (signal.Status == SignalStatus.Win)
            {
                current = current >= 0 ? current + 1 : 1;
                runningLosing = 0;
            }
            else if (signal.Status == SignalStatus.Loss)
            {
                current = current <= 0 ? current - 1 : -1;
                runningLosing++;
                maxLosing = Math.Max(maxLosing, runningLosing);
            }
            else
            {
                runningLosing = 0;
            }
        }
        return (current, maxLosing);
    }

    private IQueryable<Signal> LoadFullSignalQuery() => _db.Signals.AsNoTracking()
        .Include(s => s.TradingPair)
        .Include(s => s.StrategyVersion).ThenInclude(v => v!.Strategy)
        .Include(s => s.Scores)
        .Include(s => s.Reasons)
        .Include(s => s.Result)
        .Include(s => s.Snapshots);

    private static SignalListItemDto ToListItemDto(Signal s) => new(
        s.Id, s.TradeNumber, s.TradingPair!.Symbol, s.TradingPair.MarketType, s.Direction, s.Status,
        s.EntryTimeUtc, s.ExpirationTimeUtc, s.ConfidencePercent, s.StrategyVersion!.Strategy!.Name, s.MarketCondition,
        s.DataSourceName.Contains("Demo", StringComparison.OrdinalIgnoreCase));

    private Task<SignalDto> ToDtoAsync(Signal s, CancellationToken ct)
    {
        var score = s.Scores.FirstOrDefault();
        var scoreDto = score is null ? null : new SignalScoreDto(
            score.TrendScore, score.MarketStructureScore, score.MomentumScore, score.CandlePressureScore,
            score.SupportResistanceScore, score.BreakoutScore, score.VolatilityScore, score.DataQualityScore,
            score.HistoricalStrategyScore, score.MultiTimeframeScore, score.FinalCalibratedConfidence);

        var reasons = s.Reasons.Select(r => new SignalReasonDto(r.IsSupporting, r.Code, r.Description, r.IndicatorsUsedCsv)).ToList();

        var resultDto = s.Result is null ? null : new SignalResultDto(
            s.Result.Outcome, s.Result.EntryPrice, s.Result.ExpirationPrice, s.Result.EntryTimestampUtc,
            s.Result.ExpirationTimestampUtc, s.Result.VerificationTimestampUtc, s.Result.VerificationMethod,
            s.Result.DataSourceIdentifier, s.Result.IsLocked);

        var snapshot = s.Snapshots.FirstOrDefault(sn => sn.Label == "AtCreation") ?? s.Snapshots.FirstOrDefault();
        var candlePoints = new List<CandleSnapshotPointDto>();
        if (snapshot is not null)
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<CandleSnapshotPointDto>>(snapshot.CandlesJson);
                if (parsed is not null) candlePoints = parsed;
            }
            catch { /* malformed snapshot JSON is treated as empty rather than failing the whole response */ }
        }

        var dto = new SignalDto(
            s.Id, s.TradeNumber, s.TradingPair!.Symbol, s.TradingPair.DisplayName, s.TradingPair.MarketType,
            s.PayoutPercentAtCreation, s.Direction, s.Status, s.SignalCreatedAtUtc, s.EntryTimeUtc, s.ExpirationTimeUtc,
            s.Duration, s.Timeframe, s.ConfidencePercent, s.StrategyVersion!.Strategy!.Name, s.StrategyVersion.VersionNumber,
            s.MarketCondition, s.AnalysisExplanationEn, s.AnalysisExplanationUr, s.EntryPrice, s.ExpirationPrice,
            s.DataSourceName, s.DataQuality, s.DataSourceName.Contains("Demo", StringComparison.OrdinalIgnoreCase),
            scoreDto, reasons, resultDto, candlePoints);

        return Task.FromResult(dto);
    }
}
