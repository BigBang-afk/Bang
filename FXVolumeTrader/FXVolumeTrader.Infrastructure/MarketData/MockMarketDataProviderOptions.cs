namespace FXVolumeTrader.Infrastructure.MarketData;

/// <summary>Bound from appsettings.json "MarketData:Mock".</summary>
public sealed class MockMarketDataProviderOptions
{
    public int TickIntervalMilliseconds { get; init; } = 400;

    public decimal BasePrice { get; init; } = 1.08750m;

    /// <summary>Maximum absolute random-walk step applied per tick.</summary>
    public decimal VolatilityPerTick { get; init; } = 0.00006m;

    public decimal TypicalSpread { get; init; } = 0.00006m;
}
