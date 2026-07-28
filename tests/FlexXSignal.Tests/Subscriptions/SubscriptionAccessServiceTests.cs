using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.Infrastructure.Services;
using FlexXSignal.Tests.TestSupport;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FlexXSignal.Tests.Subscriptions;

public class SubscriptionAccessServiceTests
{
    [Fact]
    public void IsPairAllowed_AllowAllPairsTrue_AllowsEverything()
    {
        var plan = new SubscriptionPlan { AllowAllPairs = true };
        var pair = new TradingPair { Symbol = "EURUSD", MarketType = PairMarketType.Regular };

        SubscriptionAccessService.IsPairAllowed(plan, pair).Should().BeTrue();
    }

    [Fact]
    public void IsPairAllowed_OtcPairWithoutOtcAccess_IsBlocked()
    {
        var plan = new SubscriptionPlan { AllowAllPairs = false, AllowedPairsCsv = "EURUSD_OTC", OtcPairsAccess = false };
        var pair = new TradingPair { Symbol = "EURUSD_OTC", MarketType = PairMarketType.Otc };

        SubscriptionAccessService.IsPairAllowed(plan, pair).Should().BeFalse();
    }

    [Fact]
    public void IsPairAllowed_PairNotInAllowList_IsBlocked()
    {
        var plan = new SubscriptionPlan { AllowAllPairs = false, AllowedPairsCsv = "EURUSD,GBPUSD" };
        var pair = new TradingPair { Symbol = "USDJPY", MarketType = PairMarketType.Regular };

        SubscriptionAccessService.IsPairAllowed(plan, pair).Should().BeFalse();
    }

    [Fact]
    public void IsPairAllowed_PairInAllowList_IsAllowed()
    {
        var plan = new SubscriptionPlan { AllowAllPairs = false, AllowedPairsCsv = "EURUSD,GBPUSD" };
        var pair = new TradingPair { Symbol = "GBPUSD", MarketType = PairMarketType.Regular };

        SubscriptionAccessService.IsPairAllowed(plan, pair).Should().BeTrue();
    }

    [Fact]
    public async Task GetEffectivePlanAsync_NoActiveSubscription_FallsBackToFreePlan()
    {
        var provider = TestServiceProviderFactory.Create();
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();

        db.SubscriptionPlans.Add(new SubscriptionPlan { Name = "Free", MaxSignalsPerDay = 5, SignalHistoryDays = 7 });
        db.SubscriptionPlans.Add(new SubscriptionPlan { Name = "Premium", MaxSignalsPerDay = 100, SignalHistoryDays = 365 });
        await db.SaveChangesAsync();

        var access = new SubscriptionAccessService(db);
        var plan = await access.GetEffectivePlanAsync(userId: Guid.NewGuid());

        plan.Name.Should().Be("Free");
    }

    [Fact]
    public async Task GetEffectivePlanAsync_WithActiveSubscription_ReturnsSubscribedPlan()
    {
        var provider = TestServiceProviderFactory.Create();
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();

        var premiumPlan = new SubscriptionPlan { Name = "Premium", MaxSignalsPerDay = 100, SignalHistoryDays = 365, AllowAllPairs = true };
        db.SubscriptionPlans.Add(new SubscriptionPlan { Name = "Free", MaxSignalsPerDay = 5, SignalHistoryDays = 7 });
        db.SubscriptionPlans.Add(premiumPlan);
        await db.SaveChangesAsync();

        var userId = Guid.NewGuid();
        db.UserSubscriptions.Add(new UserSubscription
        {
            UserId = userId,
            SubscriptionPlanId = premiumPlan.Id,
            Status = SubscriptionStatus.Active,
            StartsAtUtc = DateTime.UtcNow.AddDays(-1),
            EndsAtUtc = DateTime.UtcNow.AddDays(29)
        });
        await db.SaveChangesAsync();

        var access = new SubscriptionAccessService(db);
        var plan = await access.GetEffectivePlanAsync(userId);

        plan.Name.Should().Be("Premium");
        plan.AllowAllPairs.Should().BeTrue();
    }
}
