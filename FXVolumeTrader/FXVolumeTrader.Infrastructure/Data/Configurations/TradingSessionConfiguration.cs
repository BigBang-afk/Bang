using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class TradingSessionConfiguration : IEntityTypeConfiguration<TradingSession>
{
    public void Configure(EntityTypeBuilder<TradingSession> builder)
    {
        builder.ToTable("TradingSessions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.StartingBalance).HasPrecision(18, 2);
        builder.Property(x => x.EndingBalance).HasPrecision(18, 2);
        builder.Property(x => x.NetResult).HasPrecision(18, 2);
    }
}
