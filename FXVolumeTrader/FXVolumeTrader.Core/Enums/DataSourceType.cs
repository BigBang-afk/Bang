namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// Identifies where ticks/candles originated. Never represents an
/// unofficial or scraped Quotex connection - see IMarketDataProvider docs.
/// </summary>
public enum DataSourceType
{
    Mock = 0,
    CsvReplay = 1,
    OfficialApi = 2
}
