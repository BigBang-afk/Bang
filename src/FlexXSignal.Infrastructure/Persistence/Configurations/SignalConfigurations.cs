using FlexXSignal.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlexXSignal.Infrastructure.Persistence.Configurations;

public class SignalConfiguration : IEntityTypeConfiguration<Signal>
{
    public void Configure(EntityTypeBuilder<Signal> builder)
    {
        builder.HasIndex(x => x.EntryTimeUtc);
        builder.HasIndex(x => x.TradingPairId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.TradeNumber).IsUnique();
        builder.Property(x => x.TradeNumber).UseIdentityAlwaysColumn();

        builder.HasOne(x => x.TradingPair).WithMany().HasForeignKey(x => x.TradingPairId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.StrategyVersion).WithMany().HasForeignKey(x => x.StrategyVersionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Scores).WithOne(s => s.Signal).HasForeignKey(s => s.SignalId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Reasons).WithOne(r => r.Signal).HasForeignKey(r => r.SignalId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Result).WithOne(r => r.Signal!).HasForeignKey<SignalResult>(r => r.SignalId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Snapshots).WithOne(s => s.Signal).HasForeignKey(s => s.SignalId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class SignalResultConfiguration : IEntityTypeConfiguration<SignalResult>
{
    public void Configure(EntityTypeBuilder<SignalResult> builder)
    {
        builder.HasIndex(x => x.Outcome);
        builder.HasIndex(x => x.SignalId).IsUnique();
    }
}
