using FlexXSignal.Application.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.MarketData;

public interface IMarketDataService
{
    Task<Result<IReadOnlyList<TradingPairDto>>> GetPairsAsync(bool activeOnly, CancellationToken ct = default);
    Task<Result<TradingPairDto>> UpsertPairAsync(Guid? pairId, UpsertTradingPairRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<TradingSessionDto>>> GetSessionsAsync(CancellationToken ct = default);
    Task<Result<TradingSessionDto>> UpsertSessionAsync(Guid? sessionId, UpsertTradingSessionRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<ProviderConfigurationDto>>> GetProviderConfigurationsAsync(CancellationToken ct = default);
    Task<Result<ProviderConfigurationDto>> UpsertProviderConfigurationAsync(Guid? configId, UpsertProviderConfigurationRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<DataHealthDto>>> GetRecentHealthAsync(int count, CancellationToken ct = default);
    Task<Result<IReadOnlyList<CandlePointDto>>> GetCandlesAsync(string pairSymbol, Timeframe timeframe, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task<Result<CsvImportResultDto>> ImportCsvAsync(Stream csvStream, string pairSymbol, Timeframe timeframe, Guid adminUserId, CancellationToken ct = default);
}
