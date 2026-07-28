using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Services;

/// <summary>Resolves the effective subscription-plan restrictions for a user (or the Free plan defaults
/// for anonymous/unsubscribed users), shared by SignalService, MarketDataService and BacktestService.</summary>
public sealed class SubscriptionAccessService
{
    private readonly AppDbContext _db;

    public SubscriptionAccessService(AppDbContext db) => _db = db;

    public async Task<SubscriptionPlan> GetEffectivePlanAsync(Guid? userId, CancellationToken ct = default)
    {
        if (userId.HasValue)
        {
            var activeSub = await _db.UserSubscriptions.AsNoTracking()
                .Include(s => s.SubscriptionPlan)
                .Where(s => s.UserId == userId && s.Status == SubscriptionStatus.Active && s.EndsAtUtc > DateTime.UtcNow)
                .OrderByDescending(s => s.EndsAtUtc)
                .FirstOrDefaultAsync(ct);
            if (activeSub?.SubscriptionPlan is not null) return activeSub.SubscriptionPlan;
        }

        var freePlan = await _db.SubscriptionPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Name == "Free", ct);
        return freePlan ?? new SubscriptionPlan { Name = "Free", MaxSignalsPerDay = 5, SignalDelaySeconds = 60, SignalHistoryDays = 7 };
    }

    public static bool IsPairAllowed(SubscriptionPlan plan, TradingPair pair)
    {
        if (plan.AllowAllPairs) return true;
        if (pair.MarketType == PairMarketType.Otc && !plan.OtcPairsAccess) return false;
        if (string.IsNullOrWhiteSpace(plan.AllowedPairsCsv)) return false;
        return plan.AllowedPairsCsv.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Contains(pair.Symbol, StringComparer.OrdinalIgnoreCase);
    }
}
