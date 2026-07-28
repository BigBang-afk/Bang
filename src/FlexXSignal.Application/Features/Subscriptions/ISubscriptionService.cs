using FlexXSignal.Application.Common;

namespace FlexXSignal.Application.Features.Subscriptions;

public interface ISubscriptionService
{
    Task<Result<IReadOnlyList<SubscriptionPlanDto>>> GetPlansAsync(bool activeOnly, CancellationToken ct = default);
    Task<Result<SubscriptionPlanDto>> UpsertPlanAsync(Guid? planId, UpsertSubscriptionPlanRequest request, Guid adminUserId, CancellationToken ct = default);
    Task<Result<UserSubscriptionDto?>> GetActiveSubscriptionAsync(Guid userId, CancellationToken ct = default);
    Task<Result<Guid>> SubmitPaymentAsync(Guid userId, SubmitPaymentRequest request, CancellationToken ct = default);
    Task<Result<IReadOnlyList<PaymentRecordDto>>> GetPendingPaymentsAsync(CancellationToken ct = default);
    Task<Result> ReviewPaymentAsync(Guid paymentId, ReviewPaymentRequest request, Guid adminUserId, CancellationToken ct = default);
}
