namespace FlexXSignal.SignalEngine.Models;

/// <summary>
/// Lightweight, provider/EF-agnostic OHLCV record the engine operates on.
/// Keeping the engine decoupled from Domain.Candle keeps strategy logic pure and unit-testable.
/// </summary>
public sealed class CandleData
{
    public DateTime OpenTimeUtc { get; init; }
    public DateTime CloseTimeUtc { get; init; }
    public decimal Open { get; init; }
    public decimal High { get; init; }
    public decimal Low { get; init; }
    public decimal Close { get; init; }
    public decimal Volume { get; init; }
    public bool IsClosed { get; init; } = true;

    public decimal BodySize => Math.Abs(Close - Open);
    public decimal Range => High - Low;
    public bool IsBullish => Close > Open;
    public bool IsBearish => Close < Open;
    public decimal UpperWick => High - Math.Max(Open, Close);
    public decimal LowerWick => Math.Min(Open, Close) - Low;

    /// <summary>Upper wick as a ratio of the full candle range (0 when range is 0).</summary>
    public decimal UpperWickRatio => Range == 0 ? 0 : UpperWick / Range;

    /// <summary>Lower wick as a ratio of the full candle range (0 when range is 0).</summary>
    public decimal LowerWickRatio => Range == 0 ? 0 : LowerWick / Range;

    /// <summary>Body as a ratio of the full candle range (0 when range is 0).</summary>
    public decimal BodyRatio => Range == 0 ? 0 : BodySize / Range;
}
