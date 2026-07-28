using FlexXSignal.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FlexXSignal.Infrastructure.Persistence.Configurations;

public class BacktestConfiguration : IEntityTypeConfiguration<Backtest>
{
    public void Configure(EntityTypeBuilder<Backtest> builder)
    {
        builder.HasIndex(x => x.CreatedAtUtc);
        builder.HasOne(x => x.TradingPair).WithMany().HasForeignKey(x => x.TradingPairId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.StrategyVersion).WithMany().HasForeignKey(x => x.StrategyVersionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Trades).WithOne(t => t.Backtest).HasForeignKey(t => t.BacktestId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Metrics).WithOne(m => m.Backtest).HasForeignKey(m => m.BacktestId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class BacktestTradeConfiguration : IEntityTypeConfiguration<BacktestTrade>
{
    public void Configure(EntityTypeBuilder<BacktestTrade> builder)
    {
        builder.HasIndex(x => x.BacktestId);
    }
}
