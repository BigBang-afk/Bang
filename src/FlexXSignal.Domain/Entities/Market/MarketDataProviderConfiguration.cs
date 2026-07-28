using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class MarketDataProviderConfiguration : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public MarketDataProviderType ProviderType { get; set; } = MarketDataProviderType.Demo;
    public bool IsActive { get; set; }
    public string? ApiEndpoint { get; set; }
    /// <summary>Encrypted at rest via IDataProtector; never logged.</summary>
    public string? ApiKeyEncrypted { get; set; }
    public int ConnectionTimeoutSeconds { get; set; } = 15;
    public int ReconnectIntervalSeconds { get; set; } = 5;
    public int MaxReconnectAttempts { get; set; } = 10;
    public string TimeZoneId { get; set; } = "UTC";
    public string CandleAlignmentMode { get; set; } = "ExchangeClock"; // ExchangeClock | ServerClock
    /// <summary>JSON mapping of internal pair symbol -> provider symbol.</summary>
    public string PairMappingJson { get; set; } = "{}";
    public string? CsvImportDirectory { get; set; }
    public ProviderConnectionStatus LastKnownStatus { get; set; } = ProviderConnectionStatus.Disconnected;
    public DateTime? LastConnectedAtUtc { get; set; }
    public DateTime? LastDataReceivedAtUtc { get; set; }
}
