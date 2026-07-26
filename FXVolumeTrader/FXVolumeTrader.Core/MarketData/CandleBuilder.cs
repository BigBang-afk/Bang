using FXVolumeTrader.Core.Enums;
using FXVolumeTrader.Core.Models;

namespace FXVolumeTrader.Core.MarketData;

/// <summary>
/// Builds candles for one symbol across all seven supported timeframes
/// simultaneously from a live tick stream. Candle boundaries are aligned
/// to fixed UTC epoch buckets (not "first tick received"), so the same
/// tick stream always produces the same candle boundaries regardless of
/// when the builder was created - this is what makes the output
/// non-repainting and reproducible for backtesting. A candle is only ever
/// mutated while it is the open candle for its timeframe; once a new
/// boundary is reached it is finalized (see Candle.MarkFinalized) and
/// never touched again.
/// </summary>
public sealed class CandleBuilder
{
    private static readonly TimeframeType[] AllTimeframes = Enum.GetValues<TimeframeType>();

    private readonly string _symbol;
    private readonly Dictionary<TimeframeType, Candle> _openCandles = new();

    public CandleBuilder(string symbol)
    {
        _symbol = symbol;
    }

    /// <summary>The current in-progress (not yet finalized) candle per timeframe.</summary>
    public IReadOnlyDictionary<TimeframeType, Candle> OpenCandles => _openCandles;

    /// <summary>Raised the instant a candle's boundary is crossed and it is finalized.</summary>
    public event EventHandler<CandleClosedEventArgs>? CandleClosed;

    public void ApplyTick(Tick tick)
    {
        foreach (var timeframe in AllTimeframes)
        {
            var boundaryStart = GetBoundaryStart(tick.TimestampUtc, timeframe);

            if (!_openCandles.TryGetValue(timeframe, out var candle) || candle.StartTimeUtc != boundaryStart)
            {
                if (candle is not null && !candle.IsFinalized)
                {
                    candle.MarkFinalized();
                    CandleClosed?.Invoke(this, new CandleClosedEventArgs { Timeframe = timeframe, Candle = candle });
                }

                candle = new Candle
                {
                    Symbol = _symbol,
                    Timeframe = timeframe,
                    StartTimeUtc = boundaryStart,
                    EndTimeUtc = boundaryStart.AddSeconds((int)timeframe)
                };
                _openCandles[timeframe] = candle;
            }

            candle.ApplyTick(tick);
        }
    }

    private static DateTime GetBoundaryStart(DateTime timestampUtc, TimeframeType timeframe)
    {
        var intervalSeconds = (int)timeframe;
        var epochSeconds = (long)(timestampUtc - DateTime.UnixEpoch).TotalSeconds;
        var boundarySeconds = epochSeconds - (epochSeconds % intervalSeconds);
        return DateTime.UnixEpoch.AddSeconds(boundarySeconds);
    }
}
