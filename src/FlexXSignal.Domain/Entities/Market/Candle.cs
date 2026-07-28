using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class Candle : BaseEntity
{
    public Guid TradingPairId { get; set; }
    public TradingPair? TradingPair { get; set; }
    public Timeframe Timeframe { get; set; }
    public DateTime OpenTimeUtc { get; set; }
    public DateTime CloseTimeUtc { get; set; }
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public decimal Volume { get; set; }
    public bool IsClosed { get; set; }
    public string DataSource { get; set; } = string.Empty;
    public DataQualityStatus DataQuality { get; set; } = DataQualityStatus.Good;
    public DateTime ProviderTimestampUtc { get; set; }
    public DateTime IngestedAtUtc { get; set; } = DateTime.UtcNow;
}
