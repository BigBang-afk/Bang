using FXVolumeTrader.Core.Enums;
using FXVolumeTrader.Core.Models;

namespace FXVolumeTrader.Core.MarketData;

/// <summary>
/// Evaluates each incoming tick for duplicates, out-of-order sequencing,
/// missing timestamps, invalid prices, large price gaps, and feed delay,
/// and derives the connection-status the dashboard should show. Pure
/// domain logic - no I/O, no provider-specific knowledge.
/// </summary>
public sealed class FeedHealthMonitor
{
    private readonly FeedHealthMonitorOptions _options;
    private Tick? _lastTick;

    public FeedHealthMonitor(FeedHealthMonitorOptions? options = null)
    {
        _options = options ?? new FeedHealthMonitorOptions();
    }

    public ConnectionStatus Status { get; private set; } = ConnectionStatus.Disconnected;

    /// <summary>
    /// Evaluates a single tick against the previous one and updates Status.
    /// Returns the list of anomalies found (empty when the tick is healthy).
    /// </summary>
    public IReadOnlyList<TickAnomaly> Evaluate(Tick tick)
    {
        var anomalies = new List<TickAnomaly>();

        if (tick.TimestampUtc == default)
        {
            anomalies.Add(new TickAnomaly(TickAnomalyType.MissingTimestamp, "Tick has no timestamp."));
        }

        if (!tick.IsValid)
        {
            anomalies.Add(new TickAnomaly(TickAnomalyType.InvalidPrice, $"Invalid bid/ask/last price for {tick.Symbol}."));
        }

        var feedDelay = DateTime.UtcNow - tick.TimestampUtc;
        var isDelayed = feedDelay > TimeSpan.FromSeconds(_options.MaxFeedDelaySeconds);
        if (isDelayed)
        {
            anomalies.Add(new TickAnomaly(
                TickAnomalyType.DelayedFeed,
                $"Tick is {feedDelay.TotalSeconds:0.0}s old (max {_options.MaxFeedDelaySeconds}s)."));
        }

        if (_lastTick is not null)
        {
            if (tick.SequenceNumber == _lastTick.SequenceNumber)
            {
                anomalies.Add(new TickAnomaly(TickAnomalyType.DuplicateTick, $"Duplicate sequence number {tick.SequenceNumber}."));
            }
            else if (tick.SequenceNumber < _lastTick.SequenceNumber)
            {
                anomalies.Add(new TickAnomaly(
                    TickAnomalyType.OutOfOrderTick,
                    $"Sequence {tick.SequenceNumber} arrived after {_lastTick.SequenceNumber}."));
            }

            if (_lastTick.Last > 0 && tick.Last > 0)
            {
                var gapPercentage = Math.Abs(tick.Last - _lastTick.Last) / _lastTick.Last * 100m;
                if (gapPercentage > _options.MaxPriceGapPercentage)
                {
                    anomalies.Add(new TickAnomaly(
                        TickAnomalyType.LargePriceGap,
                        $"Price gapped {gapPercentage:0.00}% since the last tick."));
                }
            }
        }

        _lastTick = tick;
        Status = isDelayed ? ConnectionStatus.Delayed : ConnectionStatus.Connected;
        return anomalies;
    }

    /// <summary>Call when the provider disconnects so Status reflects reality immediately.</summary>
    public void MarkDisconnected()
    {
        Status = ConnectionStatus.Disconnected;
        _lastTick = null;
    }
}
