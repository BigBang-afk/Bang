using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace FlexXSignal.Infrastructure.Seed;

/// <summary>
/// Idempotent development/demo seed. Every write is guarded by an existence check so re-running
/// on an already-seeded database is a no-op. Seed account passwords are read from environment
/// variables (SEED_SUPERADMIN_PASSWORD / SEED_PREMIUM_PASSWORD) with a documented dev-only
/// fallback so a fresh `dotnet run` works out of the box; production deployments must set the
/// environment variables explicitly.
/// </summary>
public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration configuration)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = services.GetRequiredService<ILogger<AppDbContext>>();

        await SeedRolesAsync(roleManager);
        var (superAdmin, premiumUser) = await SeedUsersAsync(userManager, configuration, logger);
        var plans = await SeedSubscriptionPlansAsync(db);
        if (premiumUser is not null) await SeedPremiumSubscriptionAsync(db, premiumUser.Id, plans);
        var pairs = await SeedTradingPairsAsync(db);
        var strategyVersions = await SeedStrategiesAsync(db);
        await SeedCandlesAsync(db, pairs);
        await SeedSignalsAsync(db, pairs, strategyVersions);
        if (premiumUser is not null) await SeedNotificationsAsync(db, premiumUser.Id);
        await SeedSystemSettingsAsync(db);

        await db.SaveChangesAsync();
    }

    private static async Task SeedRolesAsync(RoleManager<IdentityRole<Guid>> roleManager)
    {
        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
            }
        }
    }

    private static async Task<(ApplicationUser? SuperAdmin, ApplicationUser? PremiumUser)> SeedUsersAsync(
        UserManager<ApplicationUser> userManager, IConfiguration configuration, ILogger logger)
    {
        var superAdminEmail = configuration["Seed:SuperAdminEmail"] ?? "admin@flexxsignal.local";
        var premiumEmail = configuration["Seed:PremiumUserEmail"] ?? "demo@flexxsignal.local";

        var superAdminPassword = Environment.GetEnvironmentVariable("SEED_SUPERADMIN_PASSWORD");
        var premiumPassword = Environment.GetEnvironmentVariable("SEED_PREMIUM_PASSWORD");

        if (string.IsNullOrWhiteSpace(superAdminPassword))
        {
            superAdminPassword = "ChangeMe123!";
            logger.LogWarning("SEED_SUPERADMIN_PASSWORD not set; using an insecure development-only default. Set this environment variable before deploying anywhere shared.");
        }
        if (string.IsNullOrWhiteSpace(premiumPassword))
        {
            premiumPassword = "ChangeMe123!";
            logger.LogWarning("SEED_PREMIUM_PASSWORD not set; using an insecure development-only default. Set this environment variable before deploying anywhere shared.");
        }

        var superAdmin = await userManager.FindByEmailAsync(superAdminEmail);
        if (superAdmin is null)
        {
            superAdmin = new ApplicationUser
            {
                UserName = superAdminEmail,
                Email = superAdminEmail,
                DisplayName = "FlexX Super Admin",
                EmailConfirmed = true,
                IsActive = true
            };
            var result = await userManager.CreateAsync(superAdmin, superAdminPassword);
            if (result.Succeeded) await userManager.AddToRoleAsync(superAdmin, Roles.SuperAdmin);
        }

        var premiumUser = await userManager.FindByEmailAsync(premiumEmail);
        if (premiumUser is null)
        {
            premiumUser = new ApplicationUser
            {
                UserName = premiumEmail,
                Email = premiumEmail,
                DisplayName = "Demo Premium User",
                EmailConfirmed = true,
                IsActive = true
            };
            var result = await userManager.CreateAsync(premiumUser, premiumPassword);
            if (result.Succeeded) await userManager.AddToRoleAsync(premiumUser, Roles.PremiumUser);
        }

        return (superAdmin, premiumUser);
    }

    private static async Task<List<SubscriptionPlan>> SeedSubscriptionPlansAsync(AppDbContext db)
    {
        if (await db.SubscriptionPlans.AnyAsync()) return await db.SubscriptionPlans.ToListAsync();

        var plans = new List<SubscriptionPlan>
        {
            new() { Name = "Free", Description = "Get started with limited daily signals.", MonthlyPrice = 0, AnnualPrice = 0, MaxSignalsPerDay = 5, AllowAllPairs = false, AllowedPairsCsv = "EURUSD,GBPUSD", SignalDelaySeconds = 120, SignalHistoryDays = 7, AnalyticsAccess = false, BacktestingAccess = false, SortOrder = 0 },
            new() { Name = "Basic", Description = "More signals and full history.", MonthlyPrice = 19, AnnualPrice = 190, MaxSignalsPerDay = 20, AllowAllPairs = false, AllowedPairsCsv = "EURUSD,GBPUSD,USDJPY,AUDCAD", SignalDelaySeconds = 30, SignalHistoryDays = 30, AnalyticsAccess = true, BacktestingAccess = false, SortOrder = 1 },
            new() { Name = "Premium", Description = "Real-time signals, full analytics, OTC pairs.", MonthlyPrice = 49, AnnualPrice = 490, MaxSignalsPerDay = 60, AllowAllPairs = true, SignalDelaySeconds = 0, SignalHistoryDays = 90, AnalyticsAccess = true, BacktestingAccess = true, OtcPairsAccess = true, SortOrder = 2 },
            new() { Name = "Professional", Description = "Unlimited signals, backtesting, priority support.", MonthlyPrice = 99, AnnualPrice = 990, MaxSignalsPerDay = 0, AllowAllPairs = true, SignalDelaySeconds = 0, SignalHistoryDays = 365, AnalyticsAccess = true, BacktestingAccess = true, OtcPairsAccess = true, SortOrder = 3 },
        };

        db.SubscriptionPlans.AddRange(plans);
        await db.SaveChangesAsync();
        return plans;
    }

    private static async Task SeedPremiumSubscriptionAsync(AppDbContext db, Guid userId, List<SubscriptionPlan> plans)
    {
        if (await db.UserSubscriptions.AnyAsync(s => s.UserId == userId)) return;
        var premiumPlan = plans.First(p => p.Name == "Premium");
        db.UserSubscriptions.Add(new UserSubscription
        {
            UserId = userId,
            SubscriptionPlanId = premiumPlan.Id,
            Status = SubscriptionStatus.Active,
            StartsAtUtc = DateTime.UtcNow.AddDays(-5),
            EndsAtUtc = DateTime.UtcNow.AddDays(25),
            BillingCycle = "Monthly"
        });
    }

    private static async Task<List<TradingPair>> SeedTradingPairsAsync(AppDbContext db)
    {
        if (await db.TradingPairs.AnyAsync()) return await db.TradingPairs.ToListAsync();

        var pairs = new List<TradingPair>
        {
            New("EURUSD", "EUR/USD", PairMarketType.Regular, "EUR", "USD", 82),
            New("GBPUSD", "GBP/USD", PairMarketType.Regular, "GBP", "USD", 80),
            New("USDJPY", "USD/JPY", PairMarketType.Regular, "USD", "JPY", 78),
            New("AUDCAD_OTC", "AUD/CAD OTC", PairMarketType.Otc, "AUD", "CAD", 88),
            New("CADJPY_OTC", "CAD/JPY OTC", PairMarketType.Otc, "CAD", "JPY", 90),
            New("EURUSD_OTC", "EUR/USD OTC", PairMarketType.Otc, "EUR", "USD", 91),
            New("GBPUSD_OTC", "GBP/USD OTC", PairMarketType.Otc, "GBP", "USD", 87),
            New("USDBDT_OTC", "USD/BDT OTC", PairMarketType.Otc, "USD", "BDT", 85),
            New("USDPKR_OTC", "USD/PKR OTC", PairMarketType.Otc, "USD", "PKR", 86),
        };

        db.TradingPairs.AddRange(pairs);
        await db.SaveChangesAsync();
        return pairs;

        static TradingPair New(string symbol, string display, PairMarketType type, string bas, string quote, decimal payout) => new()
        {
            Symbol = symbol, DisplayName = display, MarketType = type, BaseCurrency = bas, QuoteCurrency = quote,
            IsActive = true, CurrentPayoutPercent = payout, ProviderSymbolMapping = symbol, PricePrecision = 5
        };
    }

    private static async Task<Dictionary<string, StrategyVersion>> SeedStrategiesAsync(AppDbContext db)
    {
        if (await db.Strategies.AnyAsync())
        {
            var existing = await db.StrategyVersions.Include(v => v.Strategy).Where(v => v.IsActive).ToListAsync();
            return existing.ToDictionary(v => v.Strategy!.Key, v => v);
        }

        var definitions = new (string Key, string Name, string Description)[]
        {
            ("momentum-continuation", "Momentum Continuation", "Strong directional candle pressure, trend alignment, and breakout continuation."),
            ("breakout-retest", "Breakout and Retest", "Price breaks a recent level, retests it, and continues with confirmation."),
            ("liquidity-sweep-reversal", "Liquidity Sweep Reversal", "Price sweeps a recent high or low and closes back inside the range."),
            ("trend-pullback", "Trend Pullback", "Trade in the dominant trend direction after a controlled pullback."),
            ("support-resistance-rejection", "Support and Resistance Rejection", "Strong wick rejection from a confirmed zone."),
            ("candle-pressure-sequence", "Candle Pressure Sequence", "Analyzes consecutive candle bodies, wicks, and direction changes."),
            ("multi-timeframe-trend-confirmation", "Multi-Timeframe Trend Confirmation", "Requires agreement between the execution timeframe and higher timeframe."),
        };

        var result = new Dictionary<string, StrategyVersion>();
        var sortOrder = 0;

        foreach (var (key, name, description) in definitions)
        {
            var strategy = new Strategy
            {
                Key = key,
                Name = name,
                Description = description,
                Status = StrategyStatus.Enabled,
                MaxSignalsPerHour = 4,
                DailyLossLimitPercent = 100,
                SortOrder = sortOrder++
            };

            var version = new StrategyVersion
            {
                Strategy = strategy,
                VersionNumber = 1,
                IsActive = true,
                ChangeNotes = "Initial seeded version with default confidence weights.",
                MinimumPublishConfidence = 80
            };
            strategy.Versions.Add(version);

            db.Strategies.Add(strategy);
            result[key] = version;
        }

        await db.SaveChangesAsync();
        return result;
    }

    private static async Task SeedCandlesAsync(AppDbContext db, List<TradingPair> pairs)
    {
        if (await db.Candles.AnyAsync()) return;

        var random = new Random(42);
        var now = DateTime.UtcNow;

        foreach (var pair in pairs.Take(3))
        {
            var price = 1.0m + (decimal)random.NextDouble();
            var start = now.AddDays(-3);

            for (var t = start; t < now; t = t.AddMinutes(1))
            {
                var drift = ((decimal)random.NextDouble() - 0.5m) * price * 0.0006m;
                var open = price;
                var close = open + drift;
                var high = Math.Max(open, close) + (decimal)random.NextDouble() * price * 0.0003m;
                var low = Math.Min(open, close) - (decimal)random.NextDouble() * price * 0.0003m;
                price = close;

                db.Candles.Add(new Candle
                {
                    TradingPairId = pair.Id,
                    Timeframe = Timeframe.Minute1,
                    OpenTimeUtc = t,
                    CloseTimeUtc = t.AddMinutes(1),
                    Open = Math.Round(open, 5),
                    High = Math.Round(high, 5),
                    Low = Math.Round(low, 5),
                    Close = Math.Round(close, 5),
                    Volume = 100 + (decimal)random.NextDouble() * 500,
                    IsClosed = true,
                    DataSource = "DemoSeed",
                    DataQuality = DataQualityStatus.Good,
                    ProviderTimestampUtc = t
                });
            }
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedSignalsAsync(AppDbContext db, List<TradingPair> pairs, Dictionary<string, StrategyVersion> strategyVersions)
    {
        if (await db.Signals.AnyAsync()) return;

        var random = new Random(7);
        var now = DateTime.UtcNow;
        var outcomes = new[] { SignalStatus.Win, SignalStatus.Win, SignalStatus.Loss, SignalStatus.Win, SignalStatus.Tie, SignalStatus.Loss, SignalStatus.Canceled, SignalStatus.Win };
        long tradeNumber = 1;

        for (var i = 40; i >= 1; i--)
        {
            var pair = pairs[random.Next(pairs.Count)];
            var version = strategyVersions.Values.ElementAt(random.Next(strategyVersions.Count));
            var direction = random.Next(2) == 0 ? SignalDirection.Up : SignalDirection.Down;
            var confidence = 80 + random.Next(0, 18);
            var entryTime = now.AddHours(-i);
            var duration = ExpirationDuration.Minute1;
            var outcome = outcomes[random.Next(outcomes.Length)];

            var signal = new Signal
            {
                TradeNumber = tradeNumber++,
                TradingPairId = pair.Id,
                StrategyVersionId = version.Id,
                Timeframe = Timeframe.Minute1,
                Duration = duration,
                Direction = direction,
                Status = outcome,
                MarketCondition = (MarketCondition)random.Next(0, 6),
                SignalCreatedAtUtc = entryTime.AddMinutes(-2),
                EntryTimeUtc = entryTime,
                ExpirationTimeUtc = entryTime.AddSeconds((int)duration),
                ConfidencePercent = confidence,
                PayoutPercentAtCreation = pair.CurrentPayoutPercent,
                AnalysisExplanationEn = $"{(direction == SignalDirection.Up ? "Bullish" : "Bearish")} market structure detected with aligned trend and momentum indicators supporting a {direction} outlook for the next candle.",
                AnalysisExplanationUr = $"{pair.DisplayName} par {(direction == SignalDirection.Up ? "tezi" : "mandi")} ka rujhan mojood hai, agla candle {direction} ho sakta hai.",
                DataSourceName = "DemoSeed",
                DataQuality = DataQualityStatus.Good,
                EntryPrice = 1.1m + (decimal)random.NextDouble() * 0.1m,
            };

            if (outcome != SignalStatus.Canceled)
            {
                signal.ExpirationPrice = signal.EntryPrice + (outcome == SignalStatus.Win ? 1 : outcome == SignalStatus.Loss ? -1 : 0) * (direction == SignalDirection.Up ? 1 : -1) * 0.0004m;
            }
            else
            {
                signal.CancelReason = "Data provider disconnected during entry window.";
            }

            signal.Scores.Add(new SignalScore
            {
                TrendScore = 60 + random.Next(0, 40),
                MarketStructureScore = 60 + random.Next(0, 40),
                MomentumScore = 50 + random.Next(0, 40),
                CandlePressureScore = 50 + random.Next(0, 40),
                SupportResistanceScore = 50 + random.Next(0, 40),
                BreakoutScore = 40 + random.Next(0, 50),
                VolatilityScore = 60 + random.Next(0, 40),
                DataQualityScore = 100,
                HistoricalStrategyScore = 50 + random.Next(0, 30),
                MultiTimeframeScore = 50 + random.Next(0, 40),
                FinalCalibratedConfidence = confidence
            });

            signal.Reasons.Add(new SignalReason { IsSupporting = true, Code = "TrendAligned", Description = "Trend indicators aligned across timeframes.", IndicatorsUsedCsv = "EMA9,EMA21,EMA50" });

            if (outcome != SignalStatus.Canceled)
            {
                signal.Result = new SignalResult
                {
                    Outcome = outcome,
                    EntryPrice = signal.EntryPrice!.Value,
                    ExpirationPrice = signal.ExpirationPrice!.Value,
                    OriginalSignalTimestampUtc = signal.SignalCreatedAtUtc,
                    EntryTimestampUtc = signal.EntryTimeUtc,
                    ExpirationTimestampUtc = signal.ExpirationTimeUtc,
                    ProviderTimestampUtc = signal.ExpirationTimeUtc,
                    ServerTimestampUtc = signal.ExpirationTimeUtc,
                    VerificationTimestampUtc = signal.ExpirationTimeUtc,
                    VerificationMethod = VerificationMethod.Automatic,
                    DataSourceIdentifier = "DemoSeed",
                    IsLocked = true
                };
            }

            db.Signals.Add(signal);
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedNotificationsAsync(AppDbContext db, Guid userId)
    {
        if (await db.Notifications.AnyAsync(n => n.UserId == userId)) return;

        db.Notifications.AddRange(
            new Notification { UserId = userId, Type = NotificationType.System, Title = "Welcome to FlexX Signal", Message = "Your demo account is ready. Explore live signals and analytics.", IsRead = false },
            new Notification { UserId = userId, Type = NotificationType.SignalResult, Title = "Signal result: EUR/USD", Message = "Your last EUR/USD signal closed as a Win.", IsRead = true, ReadAtUtc = DateTime.UtcNow.AddHours(-2) }
        );

        if (!await db.NotificationPreferences.AnyAsync(p => p.UserId == userId))
        {
            db.NotificationPreferences.Add(new NotificationPreference { UserId = userId });
        }

        await db.SaveChangesAsync();
    }

    private static async Task SeedSystemSettingsAsync(AppDbContext db)
    {
        if (await db.SystemSettings.AnyAsync()) return;

        db.SystemSettings.AddRange(
            new SystemSetting { Key = "SignalEngine.DefaultMinimumConfidence", Value = "80", Category = "SignalEngine", DataType = "decimal", Description = "Default minimum confidence required to publish a signal." },
            new SystemSetting { Key = "SignalEngine.MinimumEntryLeadSeconds", Value = "5", Category = "SignalEngine", DataType = "int", Description = "Minimum seconds before entry time a signal may still be published." },
            new SystemSetting { Key = "Branding.SiteName", Value = "FlexX Signal", Category = "Branding", DataType = "string", Description = "Public site name." },
            new SystemSetting { Key = "DemoMode.Enabled", Value = "true", Category = "General", DataType = "bool", Description = "When true, the frontend displays seeded demo data with a DEMO DATA badge." }
        );

        await db.SaveChangesAsync();
    }
}
