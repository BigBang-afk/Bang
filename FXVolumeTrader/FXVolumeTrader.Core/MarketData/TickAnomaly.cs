using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Core.MarketData;

/// <summary>One problem found in a single tick by FeedHealthMonitor.</summary>
public sealed record TickAnomaly(TickAnomalyType Type, string Message);
