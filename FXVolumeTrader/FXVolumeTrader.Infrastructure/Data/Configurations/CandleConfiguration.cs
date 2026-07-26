using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class CandleConfiguration : IEntityTypeConfiguration<Candle>
{
    public void Configure(EntityTypeBuilder<Candle> builder)
    {
        builder.ToTable("Candles");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Symbol).IsRequired().HasMaxLength(30);
        builder.Property(x => x.DataSource).IsRequired().HasMaxLength(60);
        foreach (var name in new[] { nameof(Candle.Open), nameof(Candle.High), nameof(Candle.Low), nameof(Candle.Close) })
        {
            builder.Property(name).HasPrecision(18, 8);
        }
        builder.HasIndex(x => new { x.Symbol, x.Timeframe, x.StartTimeUtc }).IsUnique();
    }
}
