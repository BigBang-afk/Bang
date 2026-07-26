using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Core.Models;

/// <summary>
/// An in-memory OHLC candle built from ticks by the candle builder (Phase 2).
/// Once <see cref="IsFinalized"/> is true, the candle builder must never
/// mutate it again - downstream analysis and backtesting depend on that
/// guarantee to avoid repainting.
/// </summary>
public sealed class Candle
{
    public required string Symbol { get; init; }

    public required TimeframeType Timeframe { get; init; }

    public required DateTime StartTimeUtc { get; init; }

    public required DateTime EndTimeUtc { get; init; }

    public decimal Open { get; private set; }

    public decimal High { get; private set; } = decimal.MinValue;

    public decimal Low { get; private set; } = decimal.MaxValue;

    public decimal Close { get; private set; }

    public int TickVolume { get; private set; }

    public int BullishTicks { get; private set; }

    public int BearishTicks { get; private set; }

    public int NeutralTicks { get; private set; }

    public decimal AverageSpread { get; private set; }

    public decimal MaximumSpread { get; private set; }

    /// <summary>Price change per second since the candle opened.</summary>
    public decimal PriceVelocity { get; private set; }

    /// <summary>Tick-volume change per second since the candle opened.</summary>
    public decimal VolumeVelocity { get; private set; }

    public bool IsFinalized { get; private set; }

    public string DataSource { get; private set; } = string.Empty;

    private decimal _spreadSum;
    private bool _hasTicks;

    /// <summary>
    /// Applies a tick to this candle. No-op once finalized, protecting
    /// against post-close mutation (no repainting).
    /// </summary>
    public void ApplyTick(Tick tick)
    {
        if (IsFinalized)
        {
            return;
        }

        if (!_hasTicks)
        {
            Open = tick.Last;
            _hasTicks = true;
        }

        High = Math.Max(High, tick.Last);
        Low = Math.Min(Low, tick.Last);
        Close = tick.Last;

        TickVolume++;
        switch (tick.Direction)
        {
            case TickDirection.Up:
                BullishTicks++;
                break;
            case TickDirection.Down:
                BearishTicks++;
                break;
            default:
                NeutralTicks++;
                break;
        }

        _spreadSum += tick.Spread;
        AverageSpread = _spreadSum / TickVolume;
        MaximumSpread = Math.Max(MaximumSpread, tick.Spread);

        var elapsedSeconds = Math.Max(1, (tick.TimestampUtc - StartTimeUtc).TotalSeconds);
        PriceVelocity = (Close - Open) / (decimal)elapsedSeconds;
        VolumeVelocity = TickVolume / (decimal)elapsedSeconds;

        DataSource = tick.DataSource;
    }

    /// <summary>
    /// Marks the candle closed at its timeframe boundary. Idempotent.
    /// After this call, ApplyTick becomes a no-op permanently.
    /// </summary>
    public void MarkFinalized()
    {
        if (!_hasTicks)
        {
            Open = High = Low = Close = 0m;
        }
        else if (High == decimal.MinValue)
        {
            High = Low = Open;
        }

        IsFinalized = true;
    }

    public decimal Range => High - Low;

    public decimal Body => Math.Abs(Close - Open);

    /// <summary>Body as a percentage of range. Returns 0 for a zero-range candle.</summary>
    public decimal BodyPercentage => Range == 0 ? 0m : Body / Range * 100m;

    public decimal UpperWick => High - Math.Max(Open, Close);

    public decimal LowerWick => Math.Min(Open, Close) - Low;

    public decimal UpperWickPercentage => Range == 0 ? 0m : UpperWick / Range * 100m;

    public decimal LowerWickPercentage => Range == 0 ? 0m : LowerWick / Range * 100m;

    /// <summary>Where the close sits within the candle's range: 0 = at the low, 1 = at the high.</summary>
    public decimal ClosePosition => Range == 0 ? 0.5m : (Close - Low) / Range;

    public bool IsBullish => Close > Open;

    public bool IsBearish => Close < Open;

    public int TotalDirectionalTicks => BullishTicks + BearishTicks;

    public decimal BullishTickRatio => TotalDirectionalTicks == 0 ? 0m : (decimal)BullishTicks / TotalDirectionalTicks;

    public decimal BearishTickRatio => TotalDirectionalTicks == 0 ? 0m : (decimal)BearishTicks / TotalDirectionalTicks;

    /// <summary>
    /// Relative tick volume against a caller-supplied average (e.g. the
    /// trailing N-candle average maintained by the volume analysis engine).
    /// Returns 0 when there is no meaningful average yet, rather than
    /// dividing by zero.
    /// </summary>
    public decimal RelativeVolume(decimal averageTickVolume) =>
        averageTickVolume <= 0 ? 0m : TickVolume / averageTickVolume;
}
