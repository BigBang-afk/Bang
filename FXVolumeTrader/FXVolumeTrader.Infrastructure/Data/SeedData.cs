using FXVolumeTrader.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace FXVolumeTrader.Infrastructure.Data;

/// <summary>
/// Deterministic default rows applied via HasData during migrations.
/// Values here must never depend on DateTime.UtcNow or other runtime
/// state - EF Core snapshots them into the migration at design time.
/// </summary>
public static class SeedData
{
    private static readonly DateTime SeedTimestampUtc = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public static void Seed(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppSetting>().HasData(
            new AppSetting { Id = 1, Key = "App.DemoModeEnabled", Value = "true", Category = "General", Description = "Demo/paper mode is enabled by default for safety.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 2, Key = "App.DefaultTradingMode", Value = "LiveSignalOnly", Category = "General", Description = "Startup trading mode.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 3, Key = "App.Theme", Value = "Dark", Category = "Appearance", Description = "Application theme.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 4, Key = "Risk.MaxDailyLoss", Value = "50", Category = "Risk", Description = "Maximum daily loss before trading is halted.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 5, Key = "Risk.DailyProfitTarget", Value = "100", Category = "Risk", Description = "Daily profit target (informational stop point).", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 6, Key = "Risk.MaxTradesPerDay", Value = "20", Category = "Risk", Description = "Maximum number of trades allowed per day.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 7, Key = "Risk.MaxTradesPerSession", Value = "10", Category = "Risk", Description = "Maximum number of trades allowed per session.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 8, Key = "Risk.ConsecutiveLossLimit", Value = "3", Category = "Risk", Description = "Consecutive losses before a cooldown is enforced.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 9, Key = "Risk.CooldownAfterLossSeconds", Value = "300", Category = "Risk", Description = "Cooldown period after a loss.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 10, Key = "Risk.CooldownAfterSignalSeconds", Value = "15", Category = "Risk", Description = "Cooldown period after any signal is issued.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 11, Key = "Risk.FixedTradeAmount", Value = "1", Category = "Risk", Description = "Fixed trade amount used when percentage-based risk is disabled.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 12, Key = "Risk.MaxTradeAmount", Value = "25", Category = "Risk", Description = "Hard ceiling on any single trade amount.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 13, Key = "Risk.RecoverySystemEnabled", Value = "false", Category = "Risk", Description = "Optional loss-recovery sizing system. Disabled by default - increases risk when enabled.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 14, Key = "Notifications.DesktopEnabled", Value = "true", Category = "Notifications", Description = "Show a desktop notification when a new signal is generated.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 15, Key = "Notifications.SoundEnabled", Value = "true", Category = "Notifications", Description = "Play a sound alert when a new signal is generated.", UpdatedAtUtc = SeedTimestampUtc },
            new AppSetting { Id = 16, Key = "Compliance.DisclaimerAcknowledged", Value = "false", Category = "Compliance", Description = "Whether the user has acknowledged the risk warning / no-guarantee disclaimer.", UpdatedAtUtc = SeedTimestampUtc }
        );

        modelBuilder.Entity<StrategyConfiguration>().HasData(
            new StrategyConfiguration
            {
                Id = 1,
                Name = "Default Volume Pressure Strategy",
                Version = "1.0.0",
                IsActive = true,
                MinRelativeVolume = 1.2m,
                MinBodyPercentage = 50m,
                MaxWickPercentage = 40m,
                MinConfidence = 65,
                EmaFastPeriod = 20,
                EmaSlowPeriod = 50,
                EmaTrendPeriod = 200,
                RsiPeriod = 14,
                RsiOverbought = 70,
                RsiOversold = 30,
                AdxPeriod = 14,
                AdxThreshold = 20m,
                SupportResistanceDistancePips = 5m,
                SignalCooldownSeconds = 30,
                MaxSpread = 0.0005m,
                MaxFeedDelaySeconds = 5,
                CreatedAtUtc = SeedTimestampUtc,
                UpdatedAtUtc = SeedTimestampUtc
            }
        );
    }
}
