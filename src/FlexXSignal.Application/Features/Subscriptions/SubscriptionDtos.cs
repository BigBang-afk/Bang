using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Application.Features.Subscriptions;

public sealed record SubscriptionPlanDto(
    Guid Id, string Name, string Description, decimal MonthlyPrice, decimal AnnualPrice, string Currency,
    bool IsActive, int MaxSignalsPerDay, bool AllowAllPairs, int SignalDelaySeconds, int SignalHistoryDays,
    bool AnalyticsAccess, bool BacktestingAccess, bool NotificationAccess, bool OtcPairsAccess);

public sealed record UpsertSubscriptionPlanRequest(
    string Name, string Description, decimal MonthlyPrice, decimal AnnualPrice, string Currency, bool IsActive,
    int MaxSignalsPerDay, bool AllowAllPairs, string AllowedPairsCsv, int SignalDelaySeconds, int SignalHistoryDays,
    bool AnalyticsAccess, bool BacktestingAccess, bool NotificationAccess, bool OtcPairsAccess);

public sealed record UserSubscriptionDto(
    Guid Id, string PlanName, SubscriptionStatus Status, DateTime StartsAtUtc, DateTime EndsAtUtc, bool AutoRenew, string BillingCycle);

public sealed record SubmitPaymentRequest(Guid SubscriptionPlanId, string BillingCycle, decimal Amount, string Currency, string PaymentMethod, string ReferenceCode, string? ProofOfPaymentUrl);

public sealed record PaymentRecordDto(
    Guid Id, string UserEmail, decimal Amount, string Currency, string PaymentMethod, string ReferenceCode,
    PaymentStatus Status, string? ProofOfPaymentUrl, string? AdminNote, DateTime CreatedAtUtc, DateTime? ReviewedAtUtc);

public sealed record ReviewPaymentRequest(bool Approve, string? Note);
