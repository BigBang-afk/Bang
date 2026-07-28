using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

/// <summary>
/// Manual, development-safe payment record. No real payment gateway is integrated;
/// approval is performed by an administrator through IPaymentProvider (ManualPaymentProvider).
/// </summary>
public class PaymentRecord : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public Guid? UserSubscriptionId { get; set; }
    public UserSubscription? UserSubscription { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string PaymentMethod { get; set; } = string.Empty; // Bank Transfer, Manual, etc.
    public string ReferenceCode { get; set; } = string.Empty;
    public PaymentStatus Status { get; set; } = PaymentStatus.PendingReview;
    public string? ProofOfPaymentUrl { get; set; }
    public string? AdminNote { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
}
