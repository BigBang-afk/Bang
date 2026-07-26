using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class TickRecordConfiguration : IEntityTypeConfiguration<TickRecord>
{
    public void Configure(EntityTypeBuilder<TickRecord> builder)
    {
        builder.ToTable("TickRecords");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Symbol).IsRequired().HasMaxLength(30);
        builder.Property(x => x.DataSource).IsRequired().HasMaxLength(60);
        builder.Property(x => x.Bid).HasPrecision(18, 8);
        builder.Property(x => x.Ask).HasPrecision(18, 8);
        builder.Property(x => x.Last).HasPrecision(18, 8);
        builder.HasIndex(x => new { x.Symbol, x.TimestampUtc });
        builder.HasOne(x => x.TradingSession)
            .WithMany()
            .HasForeignKey(x => x.TradingSessionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
