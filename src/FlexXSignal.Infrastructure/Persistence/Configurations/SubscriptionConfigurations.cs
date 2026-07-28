using FlexXSignal.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlexXSignal.Infrastructure.Persistence.Configurations;

public class UserSubscriptionConfiguration : IEntityTypeConfiguration<UserSubscription>
{
    public void Configure(EntityTypeBuilder<UserSubscription> builder)
    {
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.UserId);
        builder.HasOne(x => x.User).WithMany(u => u.Subscriptions).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.SubscriptionPlan).WithMany(p => p.UserSubscriptions).HasForeignKey(x => x.SubscriptionPlanId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class PaymentRecordConfiguration : IEntityTypeConfiguration<PaymentRecord>
{
    public void Configure(EntityTypeBuilder<PaymentRecord> builder)
    {
        builder.HasIndex(x => x.Status);
        builder.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.UserSubscription).WithMany(s => s.PaymentRecords).HasForeignKey(x => x.UserSubscriptionId).OnDelete(DeleteBehavior.SetNull);
    }
}
