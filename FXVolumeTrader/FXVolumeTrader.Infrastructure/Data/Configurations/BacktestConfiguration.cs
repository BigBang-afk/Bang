using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FXVolumeTrader.Infrastructure.Data.Configurations;

public class BacktestConfiguration : IEntityTypeConfiguration<Backtest>
{
    public void Configure(EntityTypeBuilder<Backtest> builder)
    {
        builder.ToTable("Backtests");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);

        foreach (var name in new[]
        {
            nameof(Backtest.PayoutPercentage), nameof(Backtest.SpreadPips), nameof(Backtest.SlippagePips),
            nameof(Backtest.WinRate), nameof(Backtest.NetResult), nameof(Backtest.GrossProfit),
            nameof(Backtest.GrossLoss), nameof(Backtest.MaxDrawdown), nameof(Backtest.ProfitFactor),
            nameof(Backtest.AverageConfidence)
        })
        {
            builder.Property(name).HasPrecision(18, 4);
        }

        builder.HasOne(x => x.StrategyConfiguration)
            .WithMany(s => s.Backtests)
            .HasForeignKey(x => x.StrategyConfigurationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Trades)
            .WithOne(t => t.Backtest)
            .HasForeignKey(t => t.BacktestId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
