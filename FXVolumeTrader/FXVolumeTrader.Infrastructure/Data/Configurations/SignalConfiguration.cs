using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class SignalConfiguration : IEntityTypeConfiguration<Signal>
{
    public void Configure(EntityTypeBuilder<Signal> builder)
    {
        builder.ToTable("Signals");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Symbol).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Reason).IsRequired();
        builder.Property(x => x.StrategyVersion).IsRequired().HasMaxLength(40);
        builder.HasIndex(x => new { x.Symbol, x.CreatedAtUtc });

        builder.HasOne(x => x.Candle)
            .WithMany(c => c.Signals)
            .HasForeignKey(x => x.CandleId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.TradingSession)
            .WithMany()
            .HasForeignKey(x => x.TradingSessionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(x => x.ScoreComponents)
            .WithOne(x => x.Signal)
            .HasForeignKey(x => x.SignalId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
