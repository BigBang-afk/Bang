using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class TradeRecordConfiguration : IEntityTypeConfiguration<TradeRecord>
{
    public void Configure(EntityTypeBuilder<TradeRecord> builder)
    {
        builder.ToTable("TradeRecords");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Asset).IsRequired().HasMaxLength(30);
        builder.Property(x => x.StrategyVersion).IsRequired().HasMaxLength(40);
        builder.Property(x => x.DataSource).IsRequired().HasMaxLength(60);
        builder.Property(x => x.EntryPrice).HasPrecision(18, 8);
        builder.Property(x => x.ExitPrice).HasPrecision(18, 8);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.Payout).HasPrecision(18, 2);
        builder.Property(x => x.ProfitLoss).HasPrecision(18, 2);
        builder.HasIndex(x => x.DateUtc);
        builder.HasIndex(x => x.Result);

        builder.HasOne(x => x.Signal)
            .WithMany()
            .HasForeignKey(x => x.SignalId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.TradingSession)
            .WithMany(s => s.Trades)
            .HasForeignKey(x => x.TradingSessionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
