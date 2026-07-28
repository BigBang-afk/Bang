using FlexXSignal.Domain.Common;
using FlexXSignal.Domain.Enums;

namespace FlexXSignal.Domain.Entities;

public class UserSubscription : BaseEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public Guid SubscriptionPlanId { get; set; }
    public SubscriptionPlan? SubscriptionPlan { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Pending;
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }
    public bool AutoRenew { get; set; }
    public string BillingCycle { get; set; } = "Monthly"; // Monthly, Annual

    public ICollection<PaymentRecord> PaymentRecords { get; set; } = new List<PaymentRecord>();
}
