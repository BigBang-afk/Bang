using FlexXSignal.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<LoginHistory> LoginHistories => Set<LoginHistory>();

    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();
    public DbSet<PaymentRecord> PaymentRecords => Set<PaymentRecord>();

    public DbSet<TradingPair> TradingPairs => Set<TradingPair>();
    public DbSet<TradingSession> TradingSessions => Set<TradingSession>();
    public DbSet<Candle> Candles => Set<Candle>();
    public DbSet<MarketDataProviderConfiguration> MarketDataProviderConfigurations => Set<MarketDataProviderConfiguration>();
    public DbSet<DataHealthLog> DataHealthLogs => Set<DataHealthLog>();

    public DbSet<Strategy> Strategies => Set<Strategy>();
    public DbSet<StrategyVersion> StrategyVersions => Set<StrategyVersion>();
    public DbSet<StrategyParameter> StrategyParameters => Set<StrategyParameter>();

    public DbSet<Signal> Signals => Set<Signal>();
    public DbSet<SignalScore> SignalScores => Set<SignalScore>();
    public DbSet<SignalReason> SignalReasons => Set<SignalReason>();
    public DbSet<SignalResult> SignalResults => Set<SignalResult>();
    public DbSet<SignalSnapshot> SignalSnapshots => Set<SignalSnapshot>();

    public DbSet<Backtest> Backtests => Set<Backtest>();
    public DbSet<BacktestTrade> BacktestTrades => Set<BacktestTrade>();
    public DbSet<BacktestMetric> BacktestMetrics => Set<BacktestMetric>();

    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<NotificationTemplate> NotificationTemplates => Set<NotificationTemplate>();
    public DbSet<Announcement> Announcements => Set<Announcement>();

    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<SupportTicketMessage> SupportTicketMessages => Set<SupportTicketMessage>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);
        configurationBuilder.Properties<decimal>().HavePrecision(18, 8);
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Rename default Identity tables to avoid the AspNetX prefix leaking into a domain-focused schema.
        builder.Entity<ApplicationUser>().ToTable("Users");
        builder.Entity<IdentityRole<Guid>>().ToTable("Roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("UserRoles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("RoleClaims");
    }
}
