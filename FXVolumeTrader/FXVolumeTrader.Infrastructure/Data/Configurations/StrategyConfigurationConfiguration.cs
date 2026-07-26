using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class StrategyConfigurationConfiguration : IEntityTypeConfiguration<StrategyConfiguration>
{
    public void Configure(EntityTypeBuilder<StrategyConfiguration> builder)
    {
        builder.ToTable("StrategyConfigurations");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Version).IsRequired().HasMaxLength(40);
        builder.Property(x => x.MinRelativeVolume).HasPrecision(9, 4);
        builder.Property(x => x.MinBodyPercentage).HasPrecision(9, 4);
        builder.Property(x => x.MaxWickPercentage).HasPrecision(9, 4);
        builder.Property(x => x.AdxThreshold).HasPrecision(9, 4);
        builder.Property(x => x.SupportResistanceDistancePips).HasPrecision(9, 4);
        builder.Property(x => x.MaxSpread).HasPrecision(18, 8);
    }
}
