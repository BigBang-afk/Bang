using System.Reflection;
using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace FXVolumeTrader.Infrastructure.Data;

/// <summary>
/// The single EF Core context for FX Volume Trader's local SQLite database.
/// All entity configuration lives in Data/Configurations via
/// IEntityTypeConfiguration&lt;T&gt; and is applied from this assembly.
/// </summary>
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<AppSetting> AppSettings => Set<AppSetting>();

    public DbSet<TickRecord> TickRecords => Set<TickRecord>();

    public DbSet<Candle> Candles => Set<Candle>();

    public DbSet<Signal> Signals => Set<Signal>();

    public DbSet<SignalScoreComponent> SignalScoreComponents => Set<SignalScoreComponent>();

    public DbSet<TradeRecord> TradeRecords => Set<TradeRecord>();

    public DbSet<TradingSession> TradingSessions => Set<TradingSession>();

    public DbSet<StrategyConfiguration> StrategyConfigurations => Set<StrategyConfiguration>();

    public DbSet<Backtest> Backtests => Set<Backtest>();

    public DbSet<BacktestTrade> BacktestTrades => Set<BacktestTrade>();

    public DbSet<RiskEvent> RiskEvents => Set<RiskEvent>();

    public DbSet<ApplicationLog> ApplicationLogs => Set<ApplicationLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        SeedData.Seed(modelBuilder);
    }
}
