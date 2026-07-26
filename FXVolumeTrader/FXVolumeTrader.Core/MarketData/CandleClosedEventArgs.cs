using FXVolumeTrader.Core.Enums;
using FXVolumeTrader.Core.Models;

namespace FXVolumeTrader.Core.MarketData;

public sealed class CandleClosedEventArgs : EventArgs
{
    public required TimeframeType Timeframe { get; init; }

    public required Candle Candle { get; init; }
}
