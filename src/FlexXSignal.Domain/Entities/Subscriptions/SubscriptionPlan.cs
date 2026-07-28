using FlexXSignal.Domain.Common;

namespace FlexXSignal.Domain.Entities;

public class SubscriptionPlan : BaseEntity
{
    public string Name { get; set; } = string.Empty; // Free, Basic, Premium, Professional
    public string Description { get; set; } = string.Empty;
    public decimal MonthlyPrice { get; set; }
    public decimal AnnualPrice { get; set; }
    public string Currency { get; set; } = "USD";
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    // Configurable restrictions
    public int MaxSignalsPerDay { get; set; } = 5;
    public bool AllowAllPairs { get; set; } = false;
    public string AllowedPairsCsv { get; set; } = string.Empty;
    public int SignalDelaySeconds { get; set; } = 60;
    public int SignalHistoryDays { get; set; } = 7;
    public bool AnalyticsAccess { get; set; } = false;
    public bool BacktestingAccess { get; set; } = false;
    public bool NotificationAccess { get; set; } = true;
    public bool OtcPairsAccess { get; set; } = false;

    public ICollection<UserSubscription> UserSubscriptions { get; set; } = new List<UserSubscription>();
}
