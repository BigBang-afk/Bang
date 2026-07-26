using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// Persisted, finalized candle. Only closed candles are written - the
/// candle builder keeps in-progress candles in memory
/// (FXVolumeTrader.Core.Models.Candle) to guarantee no repainting.
/// </summary>
public class Candle
{
    public long Id { get; set; }

    public required string Symbol { get; set; }

    public TimeframeType Timeframe { get; set; }

    public DateTime StartTimeUtc { get; set; }

    public DateTime EndTimeUtc { get; set; }

    public decimal Open { get; set; }

    public decimal High { get; set; }

    public decimal Low { get; set; }

    public decimal Close { get; set; }

    public int TickVolume { get; set; }

    public int BullishTicks { get; set; }

    public int BearishTicks { get; set; }

    public int NeutralTicks { get; set; }

    public decimal AverageSpread { get; set; }

    public decimal MaximumSpread { get; set; }

    public decimal PriceVelocity { get; set; }

    public decimal VolumeVelocity { get; set; }

    public bool IsFinalized { get; set; }

    public required string DataSource { get; set; }

    public ICollection<Signal> Signals { get; set; } = new List<Signal>();
}
