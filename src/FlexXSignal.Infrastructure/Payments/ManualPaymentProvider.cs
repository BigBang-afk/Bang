using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Payments;

/// <summary>
/// Development-safe payment workflow: no real payment gateway is called. A user submits proof of an
/// offline/manual payment (bank transfer reference, etc.) and an administrator approves or rejects it.
/// This keeps the platform's stated scope (signals only, no automated money movement) intact while still
/// giving the subscription system a working, auditable approval flow.
/// </summary>
public sealed class ManualPaymentProvider : IPaymentProvider
{
    private readonly AppDbContext _db;
    private readonly IDateTimeProvider _clock;
    private readonly IAuditLogService _auditLog;

    public string ProviderName => "Manual Review";

    public ManualPaymentProvider(AppDbContext db, IDateTimeProvider clock, IAuditLogService auditLog)
    {
        _db = db;
        _clock = clock;
        _auditLog = auditLog;
    }

    public async Task<Result<Guid>> SubmitPaymentAsync(Guid userId, Guid subscriptionPlanId, decimal amount, string currency, string referenceCode, string? proofOfPaymentUrl, CancellationToken ct = default)
    {
        var plan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == subscriptionPlanId, ct);
        if (plan is null) return Result<Guid>.Failure("Subscription plan not found.");

        var payment = new PaymentRecord
        {
            UserId = userId,
            Amount = amount,
            Currency = currency,
            PaymentMethod = ProviderName,
            ReferenceCode = referenceCode,
            ProofOfPaymentUrl = proofOfPaymentUrl,
            Status = PaymentStatus.PendingReview
        };

        _db.PaymentRecords.Add(payment);
        await _db.SaveChangesAsync(ct);

        await _auditLog.LogAsync(AuditAction.Create, nameof(PaymentRecord), payment.Id.ToString(), null, new { amount, currency, subscriptionPlanId }, "Manual payment submitted for review", ct);
        return Result<Guid>.Success(payment.Id);
    }

    public async Task<Result> ApprovePaymentAsync(Guid paymentRecordId, Guid approvedByUserId, string? note, CancellationToken ct = default)
    {
        var payment = await _db.PaymentRecords.FirstOrDefaultAsync(p => p.Id == paymentRecordId, ct);
        if (payment is null) return Result.Failure("Payment record not found.");
        if (payment.Status != PaymentStatus.PendingReview) return Result.Failure("Payment has already been reviewed.");

        payment.Status = PaymentStatus.Approved;
        payment.AdminNote = note;
        payment.ReviewedByUserId = approvedByUserId;
        payment.ReviewedAtUtc = _clock.UtcNow;

        await _db.SaveChangesAsync(ct);
        await _auditLog.LogAsync(AuditAction.Update, nameof(PaymentRecord), payment.Id.ToString(), new { Status = PaymentStatus.PendingReview }, new { Status = PaymentStatus.Approved }, note, ct);
        return Result.Success();
    }

    public async Task<Result> RejectPaymentAsync(Guid paymentRecordId, Guid rejectedByUserId, string reason, CancellationToken ct = default)
    {
        var payment = await _db.PaymentRecords.FirstOrDefaultAsync(p => p.Id == paymentRecordId, ct);
        if (payment is null) return Result.Failure("Payment record not found.");
        if (payment.Status != PaymentStatus.PendingReview) return Result.Failure("Payment has already been reviewed.");

        payment.Status = PaymentStatus.Rejected;
        payment.AdminNote = reason;
        payment.ReviewedByUserId = rejectedByUserId;
        payment.ReviewedAtUtc = _clock.UtcNow;

        await _db.SaveChangesAsync(ct);
        await _auditLog.LogAsync(AuditAction.Update, nameof(PaymentRecord), payment.Id.ToString(), new { Status = PaymentStatus.PendingReview }, new { Status = PaymentStatus.Rejected }, reason, ct);
        return Result.Success();
    }
}
