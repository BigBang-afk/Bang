using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class DataHealthLog : BaseEntity
{
    public Guid MarketDataProviderConfigurationId { get; set; }
    public MarketDataProviderConfiguration? Provider { get; set; }
    public Guid? TradingPairId { get; set; }
    public TradingPair? TradingPair { get; set; }
    public ProviderConnectionStatus ConnectionStatus { get; set; }
    public DataQualityStatus DataQuality { get; set; }
    public int LatencyMs { get; set; }
    public string? Message { get; set; }
    public DateTime RecordedAtUtc { get; set; } = DateTime.UtcNow;
}
