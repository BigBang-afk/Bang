using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Subscriptions;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Services;

public sealed class SubscriptionService : ISubscriptionService
{
    private readonly AppDbContext _db;
    private readonly IDateTimeProvider _clock;
    private readonly IAuditLogService _auditLog;
    private readonly IPaymentProvider _paymentProvider;

    public SubscriptionService(AppDbContext db, IDateTimeProvider clock, IAuditLogService auditLog, IPaymentProvider paymentProvider)
    {
        _db = db;
        _clock = clock;
        _auditLog = auditLog;
        _paymentProvider = paymentProvider;
    }

    public async Task<Result<IReadOnlyList<SubscriptionPlanDto>>> GetPlansAsync(bool activeOnly, CancellationToken ct = default)
    {
        var query = _db.SubscriptionPlans.AsNoTracking().AsQueryable();
        if (activeOnly) query = query.Where(p => p.IsActive);
        var plans = await query.OrderBy(p => p.SortOrder).ToListAsync(ct);
        return Result<IReadOnlyList<SubscriptionPlanDto>>.Success(plans.Select(ToDto).ToList());
    }

    public async Task<Result<SubscriptionPlanDto>> UpsertPlanAsync(Guid? planId, UpsertSubscriptionPlanRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var plan = planId.HasValue ? await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == planId, ct) : null;
        var isNew = plan is null;
        plan ??= new SubscriptionPlan();

        plan.Name = request.Name;
        plan.Description = request.Description;
        plan.MonthlyPrice = request.MonthlyPrice;
        plan.AnnualPrice = request.AnnualPrice;
        plan.Currency = request.Currency;
        plan.IsActive = request.IsActive;
        plan.MaxSignalsPerDay = request.MaxSignalsPerDay;
        plan.AllowAllPairs = request.AllowAllPairs;
        plan.AllowedPairsCsv = request.AllowedPairsCsv;
        plan.SignalDelaySeconds = request.SignalDelaySeconds;
        plan.SignalHistoryDays = request.SignalHistoryDays;
        plan.AnalyticsAccess = request.AnalyticsAccess;
        plan.BacktestingAccess = request.BacktestingAccess;
        plan.NotificationAccess = request.NotificationAccess;
        plan.OtcPairsAccess = request.OtcPairsAccess;
        plan.UpdatedAtUtc = _clock.UtcNow;

        if (isNew) _db.SubscriptionPlans.Add(plan);
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(isNew ? AuditAction.Create : AuditAction.Update, nameof(SubscriptionPlan), plan.Id.ToString(), null, ToDto(plan), null, ct);
        return Result<SubscriptionPlanDto>.Success(ToDto(plan));
    }

    public async Task<Result<UserSubscriptionDto?>> GetActiveSubscriptionAsync(Guid userId, CancellationToken ct = default)
    {
        var sub = await _db.UserSubscriptions.AsNoTracking().Include(s => s.SubscriptionPlan)
            .Where(s => s.UserId == userId && s.Status == SubscriptionStatus.Active && s.EndsAtUtc > _clock.UtcNow)
            .OrderByDescending(s => s.EndsAtUtc)
            .FirstOrDefaultAsync(ct);

        return Result<UserSubscriptionDto?>.Success(sub is null ? null : new UserSubscriptionDto(
            sub.Id, sub.SubscriptionPlan!.Name, sub.Status, sub.StartsAtUtc, sub.EndsAtUtc, sub.AutoRenew, sub.BillingCycle));
    }

    public async Task<Result<Guid>> SubmitPaymentAsync(Guid userId, SubmitPaymentRequest request, CancellationToken ct = default)
    {
        var plan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == request.SubscriptionPlanId, ct);
        if (plan is null) return Result<Guid>.Failure("Subscription plan not found.");

        var pendingSub = new UserSubscription
        {
            UserId = userId,
            SubscriptionPlanId = plan.Id,
            Status = SubscriptionStatus.Pending,
            BillingCycle = request.BillingCycle,
            StartsAtUtc = _clock.UtcNow,
            EndsAtUtc = _clock.UtcNow.AddDays(request.BillingCycle == "Annual" ? 365 : 30)
        };
        _db.UserSubscriptions.Add(pendingSub);
        await _db.SaveChangesAsync(ct);

        var paymentResult = await _paymentProvider.SubmitPaymentAsync(userId, plan.Id, request.Amount, request.Currency, request.ReferenceCode, request.ProofOfPaymentUrl, ct);
        if (!paymentResult.Succeeded) return Result<Guid>.Failure(paymentResult.Errors);

        var payment = await _db.PaymentRecords.FirstAsync(p => p.Id == paymentResult.Value, ct);
        payment.UserSubscriptionId = pendingSub.Id;
        await _db.SaveChangesAsync(ct);

        return Result<Guid>.Success(paymentResult.Value);
    }

    public async Task<Result<IReadOnlyList<PaymentRecordDto>>> GetPendingPaymentsAsync(CancellationToken ct = default)
    {
        var payments = await _db.PaymentRecords.AsNoTracking().Include(p => p.User)
            .Where(p => p.Status == PaymentStatus.PendingReview)
            .OrderBy(p => p.CreatedAtUtc)
            .ToListAsync(ct);

        return Result<IReadOnlyList<PaymentRecordDto>>.Success(payments.Select(p => new PaymentRecordDto(
            p.Id, p.User!.Email!, p.Amount, p.Currency, p.PaymentMethod, p.ReferenceCode, p.Status,
            p.ProofOfPaymentUrl, p.AdminNote, p.CreatedAtUtc, p.ReviewedAtUtc)).ToList());
    }

    public async Task<Result> ReviewPaymentAsync(Guid paymentId, ReviewPaymentRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var reviewResult = request.Approve
            ? await _paymentProvider.ApprovePaymentAsync(paymentId, adminUserId, request.Note, ct)
            : await _paymentProvider.RejectPaymentAsync(paymentId, adminUserId, request.Note ?? "Rejected by administrator", ct);

        if (!reviewResult.Succeeded) return reviewResult;

        if (request.Approve)
        {
            var payment = await _db.PaymentRecords.FirstOrDefaultAsync(p => p.Id == paymentId, ct);
            if (payment?.UserSubscriptionId is not null)
            {
                var subscription = await _db.UserSubscriptions.FirstOrDefaultAsync(s => s.Id == payment.UserSubscriptionId, ct);
                if (subscription is not null) subscription.Status = SubscriptionStatus.Active;
                await _db.SaveChangesAsync(ct);
            }
        }

        return Result.Success();
    }

    private static SubscriptionPlanDto ToDto(SubscriptionPlan p) => new(
        p.Id, p.Name, p.Description, p.MonthlyPrice, p.AnnualPrice, p.Currency, p.IsActive,
        p.MaxSignalsPerDay, p.AllowAllPairs, p.SignalDelaySeconds, p.SignalHistoryDays,
        p.AnalyticsAccess, p.BacktestingAccess, p.NotificationAccess, p.OtcPairsAccess);
}
