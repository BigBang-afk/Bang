using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class SignalScoreComponentConfiguration : IEntityTypeConfiguration<SignalScoreComponent>
{
    public void Configure(EntityTypeBuilder<SignalScoreComponent> builder)
    {
        builder.ToTable("SignalScoreComponents");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ComponentName).IsRequired().HasMaxLength(80);
    }
}
