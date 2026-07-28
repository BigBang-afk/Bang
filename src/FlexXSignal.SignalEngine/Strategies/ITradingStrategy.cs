using FlexXSignal.SignalEngine.Models;

namespace FlexXSignal.SignalEngine.Strategies;

/// <summary>Common contract every signal-generating strategy must implement.</summary>
public interface ITradingStrategy
{
    /// <summary>Stable machine key, matches Domain.Strategy.Key (e.g. "momentum-continuation").</summary>
    string Key { get; }
    string DisplayName { get; }
    int CurrentVersion { get; }
    /// <summary>Minimum candles on the execution timeframe required before this strategy can evaluate.</summary>
    int MinimumCandlesRequired { get; }
    StrategyResult Evaluate(StrategyContext context);
}
