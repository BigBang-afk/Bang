using FlexXSignal.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlexXSignal.Infrastructure.Persistence.Configurations;

public class TradingPairConfiguration : IEntityTypeConfiguration<TradingPair>
{
    public void Configure(EntityTypeBuilder<TradingPair> builder)
    {
        builder.HasIndex(x => x.Symbol).IsUnique();
        builder.Property(x => x.Symbol).HasMaxLength(30).IsRequired();
        builder.Property(x => x.DisplayName).HasMaxLength(60).IsRequired();
    }
}

public class TradingSessionConfiguration : IEntityTypeConfiguration<TradingSession>
{
    public void Configure(EntityTypeBuilder<TradingSession> builder)
    {
        builder.HasOne(x => x.TradingPair).WithMany(p => p.TradingSessions).HasForeignKey(x => x.TradingPairId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class CandleConfiguration : IEntityTypeConfiguration<Candle>
{
    public void Configure(EntityTypeBuilder<Candle> builder)
    {
        builder.HasIndex(x => new { x.TradingPairId, x.Timeframe, x.OpenTimeUtc }).IsUnique();
        builder.HasOne(x => x.TradingPair).WithMany().HasForeignKey(x => x.TradingPairId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class MarketDataProviderConfigurationConfiguration : IEntityTypeConfiguration<MarketDataProviderConfiguration>
{
    public void Configure(EntityTypeBuilder<MarketDataProviderConfiguration> builder)
    {
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
    }
}

public class DataHealthLogConfiguration : IEntityTypeConfiguration<DataHealthLog>
{
    public void Configure(EntityTypeBuilder<DataHealthLog> builder)
    {
        builder.HasIndex(x => x.RecordedAtUtc);
        builder.HasOne(x => x.Provider).WithMany().HasForeignKey(x => x.MarketDataProviderConfigurationId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.TradingPair).WithMany().HasForeignKey(x => x.TradingPairId).OnDelete(DeleteBehavior.SetNull);
    }
}
