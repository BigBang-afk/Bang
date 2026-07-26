namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// The six operating modes of the application. Determines which
/// IMarketDataProvider and ITradeExecutionProvider are resolved by DI.
/// </summary>
public enum TradingMode
{
    HistoricalBacktesting = 0,
    LiveSignalOnly = 1,
    PaperTrading = 2,
    QuotexManualConfirmation = 3,
    OfficialApiBroker = 4,
    ReplayMode = 5
}
