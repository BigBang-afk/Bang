namespace FXVolumeTrader.Core.Enums;

/// <summary>
/// Reasons the risk-management engine blocked a trade or forced a stop.
/// Persisted to the RiskEvent table for audit/journal purposes.
/// </summary>
public enum RiskEventType
{
    DailyLossLimitReached = 0,
    DailyProfitTargetReached = 1,
    MaxTradesPerDayReached = 2,
    MaxTradesPerSessionReached = 3,
    ConsecutiveLossLimitReached = 4,
    CooldownAfterLossActive = 5,
    CooldownAfterSignalActive = 6,
    ActiveTradeAlreadyOpen = 7,
    DuplicateTradeBlocked = 8,
    DataFeedDisconnected = 9,
    EmergencyStopActivated = 10,
    SessionTimeLimitReached = 11,
    AccountBalanceProtectionTriggered = 12
}
