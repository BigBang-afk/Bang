using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class RiskEventConfiguration : IEntityTypeConfiguration<RiskEvent>
{
    public void Configure(EntityTypeBuilder<RiskEvent> builder)
    {
        builder.ToTable("RiskEvents");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Description).IsRequired();
        builder.HasIndex(x => x.OccurredAtUtc);

        builder.HasOne(x => x.TradingSession)
            .WithMany(s => s.RiskEvents)
            .HasForeignKey(x => x.TradingSessionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
