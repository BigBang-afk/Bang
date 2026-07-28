using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Strategies;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Services;

public sealed class StrategyService : IStrategyService
{
    private readonly AppDbContext _db;
    private readonly IDateTimeProvider _clock;
    private readonly IAuditLogService _auditLog;

    public StrategyService(AppDbContext db, IDateTimeProvider clock, IAuditLogService auditLog)
    {
        _db = db;
        _clock = clock;
        _auditLog = auditLog;
    }

    public async Task<Result<IReadOnlyList<StrategyDto>>> GetAllAsync(CancellationToken ct = default)
    {
        var strategies = await _db.Strategies.AsNoTracking()
            .Include(s => s.Versions).ThenInclude(v => v.Parameters)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);
        return Result<IReadOnlyList<StrategyDto>>.Success(strategies.Select(ToDto).ToList());
    }

    public async Task<Result<StrategyDto>> GetByIdAsync(Guid strategyId, CancellationToken ct = default)
    {
        var strategy = await _db.Strategies.AsNoTracking()
            .Include(s => s.Versions).ThenInclude(v => v.Parameters)
            .FirstOrDefaultAsync(s => s.Id == strategyId, ct);
        return strategy is null ? Result<StrategyDto>.Failure("Strategy not found.") : Result<StrategyDto>.Success(ToDto(strategy));
    }

    public async Task<Result<StrategyVersionDto>> CreateVersionAsync(CreateStrategyVersionRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var strategy = await _db.Strategies.Include(s => s.Versions).FirstOrDefaultAsync(s => s.Id == request.StrategyId, ct);
        if (strategy is null) return Result<StrategyVersionDto>.Failure("Strategy not found.");

        var nextVersion = (strategy.Versions.Count == 0 ? 0 : strategy.Versions.Max(v => v.VersionNumber)) + 1;

        var version = new StrategyVersion
        {
            StrategyId = strategy.Id,
            VersionNumber = nextVersion,
            IsActive = request.ActivateImmediately,
            ChangeNotes = request.ChangeNotes,
            WeightTrendAlignment = request.WeightTrendAlignment,
            WeightMarketStructure = request.WeightMarketStructure,
            WeightCandlePressure = request.WeightCandlePressure,
            WeightMomentum = request.WeightMomentum,
            WeightSupportResistance = request.WeightSupportResistance,
            WeightBreakoutRejection = request.WeightBreakoutRejection,
            WeightMultiTimeframeAgreement = request.WeightMultiTimeframeAgreement,
            WeightVolatilityQuality = request.WeightVolatilityQuality,
            WeightHistoricalPerformance = request.WeightHistoricalPerformance,
            MinimumPublishConfidence = request.MinimumPublishConfidence
        };

        foreach (var (key, value) in request.Parameters)
        {
            version.Parameters.Add(new StrategyParameter { Key = key, Value = value, DataType = "decimal" });
        }

        if (request.ActivateImmediately)
        {
            foreach (var v in strategy.Versions) v.IsActive = false;
        }

        _db.StrategyVersions.Add(version);
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(AuditAction.Create, nameof(StrategyVersion), version.Id.ToString(), null, new { strategy.Name, version.VersionNumber }, request.ChangeNotes, ct);

        return Result<StrategyVersionDto>.Success(ToDto(version));
    }

    public async Task<Result> UpdateStatusAsync(Guid strategyId, UpdateStrategyStatusRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var strategy = await _db.Strategies.FirstOrDefaultAsync(s => s.Id == strategyId, ct);
        if (strategy is null) return Result.Failure("Strategy not found.");
        var old = strategy.Status;
        strategy.Status = request.Status;
        strategy.UpdatedAtUtc = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _auditLog.LogAsync(AuditAction.ConfigurationChange, nameof(Strategy), strategy.Id.ToString(), new { Status = old }, new { Status = request.Status }, null, ct);
        return Result.Success();
    }

    public async Task<Result> ActivateVersionAsync(Guid strategyVersionId, Guid adminUserId, CancellationToken ct = default)
    {
        var version = await _db.StrategyVersions.Include(v => v.Strategy).ThenInclude(s => s!.Versions).FirstOrDefaultAsync(v => v.Id == strategyVersionId, ct);
        if (version is null) return Result.Failure("Strategy version not found.");

        foreach (var v in version.Strategy!.Versions) v.IsActive = v.Id == version.Id;
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(AuditAction.ConfigurationChange, nameof(StrategyVersion), version.Id.ToString(), null, new { version.VersionNumber }, "Activated as current strategy version", ct);
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<StrategyPerformanceDto>>> GetPerformanceComparisonAsync(CancellationToken ct = default)
    {
        var results = await _db.Signals.AsNoTracking()
            .Include(s => s.StrategyVersion).ThenInclude(v => v!.Strategy)
            .Include(s => s.Result)
            .Where(s => s.Result != null)
            .GroupBy(s => s.StrategyVersion!.Strategy!.Name)
            .Select(g => new StrategyPerformanceDto(
                g.Key,
                g.Count(),
                g.Count(s => s.Result!.Outcome == SignalStatus.Win),
                g.Count(s => s.Result!.Outcome == SignalStatus.Loss),
                g.Count(s => s.Result!.Outcome == SignalStatus.Tie),
                g.Count() == 0 ? 0 : Math.Round(100m * g.Count(s => s.Result!.Outcome == SignalStatus.Win) / g.Count(s => s.Result!.Outcome == SignalStatus.Win || s.Result!.Outcome == SignalStatus.Loss || s.Result!.Outcome == SignalStatus.Tie), 2),
                g.Average(s => s.ConfidencePercent)))
            .ToListAsync(ct);

        return Result<IReadOnlyList<StrategyPerformanceDto>>.Success(results);
    }

    private static StrategyDto ToDto(Strategy s) => new(
        s.Id, s.Name, s.Key, s.Description, s.Status, s.MaxSignalsPerHour, s.DailyLossLimitPercent,
        s.Versions.OrderByDescending(v => v.VersionNumber).Select(ToDto).ToList());

    private static StrategyVersionDto ToDto(StrategyVersion v) => new(
        v.Id, v.VersionNumber, v.IsActive, v.ChangeNotes,
        v.WeightTrendAlignment, v.WeightMarketStructure, v.WeightCandlePressure, v.WeightMomentum,
        v.WeightSupportResistance, v.WeightBreakoutRejection, v.WeightMultiTimeframeAgreement,
        v.WeightVolatilityQuality, v.WeightHistoricalPerformance, v.MinimumPublishConfidence,
        v.Parameters.Select(p => new StrategyParameterDto(p.Key, p.Value, p.DataType, p.Description)).ToList());
}
