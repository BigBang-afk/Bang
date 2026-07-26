using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class BacktestTradeConfiguration : IEntityTypeConfiguration<BacktestTrade>
{
    public void Configure(EntityTypeBuilder<BacktestTrade> builder)
    {
        builder.ToTable("BacktestTrades");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Asset).IsRequired().HasMaxLength(30);
        builder.Property(x => x.EntryPrice).HasPrecision(18, 8);
        builder.Property(x => x.ExitPrice).HasPrecision(18, 8);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.Payout).HasPrecision(18, 2);
        builder.Property(x => x.ProfitLoss).HasPrecision(18, 2);
        builder.HasIndex(x => x.BacktestId);
    }
}
