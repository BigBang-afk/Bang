namespace FlexXSignal.Domain.Enums;

public enum SignalDirection
{
    Up = 0,
    Down = 1
}

public enum SignalStatus
{
    Draft = 0,
    Scheduled = 1,
    Waiting = 2,
    Active = 3,
    Win = 4,
    Loss = 5,
    Tie = 6,
    Canceled = 7,
    Missed = 8,
    DataError = 9
}

public enum MarketCondition
{
    Trending = 0,
    Ranging = 1,
    Volatile = 2,
    Quiet = 3,
    Breakout = 4,
    Reversal = 5,
    Unclear = 6
}

public enum StrategyStatus
{
    Disabled = 0,
    Enabled = 1,
    Testing = 2
}

public enum MarketDataProviderType
{
    Demo = 0,
    Csv = 1,
    AuthorizedWebSocket = 2,
    AuthorizedRest = 3,
    /// <summary>Read-only quotes via the quotex-sidecar service. Never places trades; the sidecar
    /// holds the Quotex account credentials, not this application.</summary>
    Quotex = 4
}

public enum ProviderConnectionStatus
{
    Disconnected = 0,
    Connecting = 1,
    Connected = 2,
    Reconnecting = 3,
    Faulted = 4
}

public enum DataQualityStatus
{
    Good = 0,
    Delayed = 1,
    Incomplete = 2,
    Invalid = 3,
    Stale = 4
}

public enum PairMarketType
{
    Regular = 0,
    Otc = 1
}

public enum Timeframe
{
    Seconds15 = 15,
    Seconds30 = 30,
    Minute1 = 60,
    Minutes5 = 300,
    Minutes15 = 900
}

public enum ExpirationDuration
{
    Seconds30 = 30,
    Minute1 = 60,
    Minutes2 = 120,
    Minutes3 = 180,
    Minutes5 = 300
}

public enum VerificationMethod
{
    Automatic = 0,
    ManualCorrection = 1
}

public enum SubscriptionStatus
{
    Pending = 0,
    Active = 1,
    Expired = 2,
    Canceled = 3,
    Rejected = 4
}

public enum PaymentStatus
{
    PendingReview = 0,
    Approved = 1,
    Rejected = 2,
    Refunded = 3
}

public enum NotificationType
{
    SignalCreated = 0,
    SignalActivated = 1,
    SignalResult = 2,
    Announcement = 3,
    System = 4,
    SupportReply = 5,
    SubscriptionUpdate = 6
}

public enum NotificationChannel
{
    InApp = 0,
    Browser = 1,
    Email = 2,
    Telegram = 3
}

public enum SupportTicketStatus
{
    Open = 0,
    InProgress = 1,
    WaitingOnUser = 2,
    Resolved = 3,
    Closed = 4
}

public enum SupportTicketPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3
}

public enum BacktestStatus
{
    Queued = 0,
    Running = 1,
    Completed = 2,
    Failed = 3
}

public enum AuditAction
{
    Create = 0,
    Update = 1,
    Delete = 2,
    Login = 3,
    Logout = 4,
    ManualSignalResultCorrection = 5,
    SecurityEvent = 6,
    ConfigurationChange = 7
}

public static class Roles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Analyst = "Analyst";
    public const string PremiumUser = "PremiumUser";
    public const string FreeUser = "FreeUser";

    public static readonly string[] All = { SuperAdmin, Admin, Analyst, PremiumUser, FreeUser };
}
