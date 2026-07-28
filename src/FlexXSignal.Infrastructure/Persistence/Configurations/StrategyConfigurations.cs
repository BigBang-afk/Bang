using FlexXSignal.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlexXSignal.Infrastructure.Persistence.Configurations;

public class StrategyConfiguration : IEntityTypeConfiguration<Strategy>
{
    public void Configure(EntityTypeBuilder<Strategy> builder)
    {
        builder.HasIndex(x => x.Key).IsUnique();
        builder.Property(x => x.Key).HasMaxLength(60).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
    }
}

public class StrategyVersionConfiguration : IEntityTypeConfiguration<StrategyVersion>
{
    public void Configure(EntityTypeBuilder<StrategyVersion> builder)
    {
        builder.HasIndex(x => new { x.StrategyId, x.VersionNumber }).IsUnique();
        builder.HasOne(x => x.Strategy).WithMany(s => s.Versions).HasForeignKey(x => x.StrategyId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class StrategyParameterConfiguration : IEntityTypeConfiguration<StrategyParameter>
{
    public void Configure(EntityTypeBuilder<StrategyParameter> builder)
    {
        builder.HasIndex(x => new { x.StrategyVersionId, x.Key }).IsUnique();
        builder.HasOne(x => x.StrategyVersion).WithMany(v => v.Parameters).HasForeignKey(x => x.StrategyVersionId).OnDelete(DeleteBehavior.Cascade);
    }
}
