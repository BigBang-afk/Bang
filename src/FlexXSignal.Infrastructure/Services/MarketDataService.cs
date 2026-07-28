using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.MarketData;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.MarketDataProviders;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Services;

public sealed class MarketDataService : IMarketDataService
{
    private readonly AppDbContext _db;
    private readonly IDateTimeProvider _clock;
    private readonly IAuditLogService _auditLog;
    private readonly IApiKeyProtector _apiKeyProtector;
    private readonly CsvMarketDataProvider _csvProvider;

    public MarketDataService(AppDbContext db, IDateTimeProvider clock, IAuditLogService auditLog, IApiKeyProtector apiKeyProtector, CsvMarketDataProvider csvProvider)
    {
        _db = db;
        _clock = clock;
        _auditLog = auditLog;
        _apiKeyProtector = apiKeyProtector;
        _csvProvider = csvProvider;
    }

    public async Task<Result<IReadOnlyList<TradingPairDto>>> GetPairsAsync(bool activeOnly, CancellationToken ct = default)
    {
        var query = _db.TradingPairs.AsNoTracking().AsQueryable();
        if (activeOnly) query = query.Where(p => p.IsActive);
        var pairs = await query.OrderBy(p => p.SortOrder).ThenBy(p => p.DisplayName).ToListAsync(ct);
        return Result<IReadOnlyList<TradingPairDto>>.Success(pairs.Select(ToDto).ToList());
    }

    public async Task<Result<TradingPairDto>> UpsertPairAsync(Guid? pairId, UpsertTradingPairRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var pair = pairId.HasValue ? await _db.TradingPairs.FirstOrDefaultAsync(p => p.Id == pairId, ct) : null;
        var isNew = pair is null;
        var old = pair is null ? null : ToDto(pair);
        pair ??= new TradingPair();

        pair.Symbol = request.Symbol;
        pair.DisplayName = request.DisplayName;
        pair.MarketType = request.MarketType;
        pair.BaseCurrency = request.BaseCurrency;
        pair.QuoteCurrency = request.QuoteCurrency;
        pair.IsActive = request.IsActive;
        pair.CurrentPayoutPercent = request.CurrentPayoutPercent;
        pair.ProviderSymbolMapping = request.ProviderSymbolMapping;
        pair.PricePrecision = request.PricePrecision;
        pair.RequiresPremium = request.RequiresPremium;
        pair.UpdatedAtUtc = _clock.UtcNow;

        if (isNew) _db.TradingPairs.Add(pair);
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(isNew ? AuditAction.Create : AuditAction.Update, nameof(TradingPair), pair.Id.ToString(), old, ToDto(pair), null, ct);
        return Result<TradingPairDto>.Success(ToDto(pair));
    }

    public async Task<Result<IReadOnlyList<TradingSessionDto>>> GetSessionsAsync(CancellationToken ct = default)
    {
        var sessions = await _db.TradingSessions.AsNoTracking().ToListAsync(ct);
        return Result<IReadOnlyList<TradingSessionDto>>.Success(sessions.Select(ToDto).ToList());
    }

    public async Task<Result<TradingSessionDto>> UpsertSessionAsync(Guid? sessionId, UpsertTradingSessionRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var session = sessionId.HasValue ? await _db.TradingSessions.FirstOrDefaultAsync(s => s.Id == sessionId, ct) : null;
        var isNew = session is null;
        session ??= new TradingSession();

        session.Name = request.Name;
        session.TradingPairId = request.TradingPairId;
        session.StartUtc = request.StartUtc;
        session.EndUtc = request.EndUtc;
        session.IsActive = request.IsActive;
        session.DaysOfWeekMask = request.DaysOfWeekMask;
        session.MaxSignalsPerHour = request.MaxSignalsPerHour;
        session.UpdatedAtUtc = _clock.UtcNow;

        if (isNew) _db.TradingSessions.Add(session);
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(isNew ? AuditAction.Create : AuditAction.Update, nameof(TradingSession), session.Id.ToString(), null, ToDto(session), null, ct);
        return Result<TradingSessionDto>.Success(ToDto(session));
    }

    public async Task<Result<IReadOnlyList<ProviderConfigurationDto>>> GetProviderConfigurationsAsync(CancellationToken ct = default)
    {
        var configs = await _db.MarketDataProviderConfigurations.AsNoTracking().ToListAsync(ct);
        return Result<IReadOnlyList<ProviderConfigurationDto>>.Success(configs.Select(ToDto).ToList());
    }

    public async Task<Result<ProviderConfigurationDto>> UpsertProviderConfigurationAsync(Guid? configId, UpsertProviderConfigurationRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var config = configId.HasValue ? await _db.MarketDataProviderConfigurations.FirstOrDefaultAsync(c => c.Id == configId, ct) : null;
        var isNew = config is null;
        config ??= new MarketDataProviderConfiguration();

        config.Name = request.Name;
        config.ProviderType = request.ProviderType;
        config.ApiEndpoint = request.ApiEndpoint;
        if (!string.IsNullOrWhiteSpace(request.ApiKey))
        {
            config.ApiKeyEncrypted = _apiKeyProtector.Encrypt(request.ApiKey);
        }
        config.ConnectionTimeoutSeconds = request.ConnectionTimeoutSeconds;
        config.ReconnectIntervalSeconds = request.ReconnectIntervalSeconds;
        config.MaxReconnectAttempts = request.MaxReconnectAttempts;
        config.TimeZoneId = request.TimeZoneId;
        config.CandleAlignmentMode = request.CandleAlignmentMode;
        config.PairMappingJson = request.PairMappingJson;
        config.CsvImportDirectory = request.CsvImportDirectory;
        config.UpdatedAtUtc = _clock.UtcNow;

        if (request.IsActive)
        {
            // Only one provider configuration may be active at a time.
            await _db.MarketDataProviderConfigurations.Where(c => c.IsActive).ForEachAsync(c => c.IsActive = false, ct);
        }
        config.IsActive = request.IsActive;

        if (isNew) _db.MarketDataProviderConfigurations.Add(config);
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(isNew ? AuditAction.Create : AuditAction.Update, nameof(MarketDataProviderConfiguration), config.Id.ToString(), null, new { config.Name, config.ProviderType, config.IsActive }, "API key redacted from audit trail", ct);
        return Result<ProviderConfigurationDto>.Success(ToDto(config));
    }

    public async Task<Result<IReadOnlyList<DataHealthDto>>> GetRecentHealthAsync(int count, CancellationToken ct = default)
    {
        var logs = await _db.DataHealthLogs.AsNoTracking()
            .Include(l => l.Provider)
            .OrderByDescending(l => l.RecordedAtUtc)
            .Take(count)
            .ToListAsync(ct);

        return Result<IReadOnlyList<DataHealthDto>>.Success(logs.Select(l =>
            new DataHealthDto(l.Provider?.Name ?? "Unknown", l.ConnectionStatus, l.DataQuality, l.LatencyMs, l.Message, l.RecordedAtUtc)).ToList());
    }

    public async Task<Result<IReadOnlyList<CandlePointDto>>> GetCandlesAsync(string pairSymbol, Timeframe timeframe, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        var pair = await _db.TradingPairs.AsNoTracking().FirstOrDefaultAsync(p => p.Symbol == pairSymbol, ct);
        if (pair is null) return Result<IReadOnlyList<CandlePointDto>>.Failure("Trading pair not found.");

        var candles = await _db.Candles.AsNoTracking()
            .Where(c => c.TradingPairId == pair.Id && c.Timeframe == timeframe && c.OpenTimeUtc >= fromUtc && c.OpenTimeUtc < toUtc)
            .OrderBy(c => c.OpenTimeUtc)
            .Select(c => new CandlePointDto(c.OpenTimeUtc, c.Open, c.High, c.Low, c.Close, c.Volume))
            .ToListAsync(ct);

        return Result<IReadOnlyList<CandlePointDto>>.Success(candles);
    }

    public async Task<Result<CsvImportResultDto>> ImportCsvAsync(Stream csvStream, string pairSymbol, Timeframe timeframe, Guid adminUserId, CancellationToken ct = default)
    {
        var pair = await _db.TradingPairs.FirstOrDefaultAsync(p => p.Symbol == pairSymbol, ct);
        if (pair is null) return Result<CsvImportResultDto>.Failure("Trading pair not found. Create it first.");

        var (imported, skipped, warnings) = await _csvProvider.ImportAsync(csvStream, ct);

        // Persist parsed rows into the Candles table so backtests and history can query them directly.
        var providerCandles = await _csvProvider.GetHistoricalCandlesAsync(pairSymbol, timeframe, DateTime.MinValue, DateTime.MaxValue, ct);
        var existingTimestamps = await _db.Candles.Where(c => c.TradingPairId == pair.Id && c.Timeframe == timeframe)
            .Select(c => c.OpenTimeUtc).ToListAsync(ct);
        var existingSet = existingTimestamps.ToHashSet();

        foreach (var pc in providerCandles.Where(pc => !existingSet.Contains(pc.OpenTimeUtc)))
        {
            _db.Candles.Add(new Candle
            {
                TradingPairId = pair.Id,
                Timeframe = timeframe,
                OpenTimeUtc = pc.OpenTimeUtc,
                CloseTimeUtc = pc.CloseTimeUtc,
                Open = pc.Open,
                High = pc.High,
                Low = pc.Low,
                Close = pc.Close,
                Volume = pc.Volume,
                IsClosed = true,
                DataSource = "CsvImport",
                DataQuality = DataQualityStatus.Good,
                ProviderTimestampUtc = pc.ProviderTimestampUtc
            });
        }
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(AuditAction.Create, nameof(Candle), pair.Id.ToString(), null, new { imported, skipped, pairSymbol, timeframe }, "CSV historical import", ct);

        return Result<CsvImportResultDto>.Success(new CsvImportResultDto(imported, skipped, warnings));
    }

    private static TradingPairDto ToDto(TradingPair p) => new(p.Id, p.Symbol, p.DisplayName, p.MarketType, p.IsActive, p.CurrentPayoutPercent, p.RequiresPremium, p.PricePrecision);

    private static TradingSessionDto ToDto(TradingSession s) => new(s.Id, s.Name, s.TradingPairId, s.StartUtc, s.EndUtc, s.IsActive, s.DaysOfWeekMask, s.MaxSignalsPerHour);

    private static ProviderConfigurationDto ToDto(MarketDataProviderConfiguration c) => new(
        c.Id, c.Name, c.ProviderType, c.IsActive, c.ApiEndpoint, !string.IsNullOrEmpty(c.ApiKeyEncrypted),
        c.ConnectionTimeoutSeconds, c.ReconnectIntervalSeconds, c.MaxReconnectAttempts, c.TimeZoneId,
        c.CandleAlignmentMode, c.PairMappingJson, c.CsvImportDirectory, c.LastKnownStatus, c.LastConnectedAtUtc, c.LastDataReceivedAtUtc);
}
