namespace FXVolumeTrader.Backtesting;

/// <summary>
/// Entry point for the non-repainting backtesting engine (CSV import,
/// time-ordered simulation, walk-forward/out-of-sample testing, and the
/// full performance report described in the product spec). Implemented
/// in Phase 5 - this project currently only establishes the assembly and
/// its reference to FXVolumeTrader.Core so later phases have a home.
/// </summary>
public static class BacktestEngine
{
    public const string Version = "0.0.0-phase1-scaffold";
}
