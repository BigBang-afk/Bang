using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.MarketData;

public sealed record TradingPairDto(
    Guid Id, string Symbol, string DisplayName, PairMarketType MarketType, bool IsActive,
    decimal CurrentPayoutPercent, bool RequiresPremium, int PricePrecision);

public sealed record UpsertTradingPairRequest(
    string Symbol, string DisplayName, PairMarketType MarketType, string BaseCurrency, string QuoteCurrency,
    bool IsActive, decimal CurrentPayoutPercent, string ProviderSymbolMapping, int PricePrecision, bool RequiresPremium);

public sealed record TradingSessionDto(Guid Id, string Name, Guid? TradingPairId, TimeSpan StartUtc, TimeSpan EndUtc, bool IsActive, string DaysOfWeekMask, int MaxSignalsPerHour);

public sealed record UpsertTradingSessionRequest(string Name, Guid? TradingPairId, TimeSpan StartUtc, TimeSpan EndUtc, bool IsActive, string DaysOfWeekMask, int MaxSignalsPerHour);

public sealed record ProviderConfigurationDto(
    Guid Id, string Name, MarketDataProviderType ProviderType, bool IsActive, string? ApiEndpoint,
    bool HasApiKeyConfigured, int ConnectionTimeoutSeconds, int ReconnectIntervalSeconds, int MaxReconnectAttempts,
    string TimeZoneId, string CandleAlignmentMode, string PairMappingJson, string? CsvImportDirectory,
    ProviderConnectionStatus LastKnownStatus, DateTime? LastConnectedAtUtc, DateTime? LastDataReceivedAtUtc);

public sealed record UpsertProviderConfigurationRequest(
    string Name, MarketDataProviderType ProviderType, bool IsActive, string? ApiEndpoint, string? ApiKey,
    int ConnectionTimeoutSeconds, int ReconnectIntervalSeconds, int MaxReconnectAttempts,
    string TimeZoneId, string CandleAlignmentMode, string PairMappingJson, string? CsvImportDirectory);

public sealed record DataHealthDto(
    string ProviderName, ProviderConnectionStatus ConnectionStatus, DataQualityStatus DataQuality,
    int LatencyMs, string? Message, DateTime RecordedAtUtc);

public sealed record CandlePointDto(DateTime OpenTimeUtc, decimal Open, decimal High, decimal Low, decimal Close, decimal Volume);

public sealed record CsvImportResultDto(int RowsImported, int RowsSkipped, IReadOnlyList<string> Warnings);
