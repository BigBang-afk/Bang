using FXVolumeTrader.Core.Enums;

namespace FXVolumeTrader.Infrastructure.Data.Entities;

/// <summary>
/// One continuous run of the application in a given mode, from Start
/// Analysis to Stop Analysis (or app shutdown). Aggregates ticks,
/// signals, and trades placed during that window.
/// </summary>
public class TradingSession
{
    public int Id { get; set; }

    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? EndedAtUtc { get; set; }

    public TradingMode Mode { get; set; }

    public decimal StartingBalance { get; set; }

    public decimal? EndingBalance { get; set; }

    public int TotalTrades { get; set; }

    public int Wins { get; set; }

    public int Losses { get; set; }

    public int Draws { get; set; }

    public decimal NetResult { get; set; }

    public ICollection<TradeRecord> Trades { get; set; } = new List<TradeRecord>();

    public ICollection<RiskEvent> RiskEvents { get; set; } = new List<RiskEvent>();
}
