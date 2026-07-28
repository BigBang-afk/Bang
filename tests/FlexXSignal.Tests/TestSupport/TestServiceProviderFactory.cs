using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Identity;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace FlexXSignal.Tests.TestSupport;

/// <summary>Fake current-user context so services that depend on ICurrentUserService can be exercised
/// in isolation from a real HTTP request; tests set UserId/Roles directly.</summary>
public sealed class FakeCurrentUserService : ICurrentUserService
{
    public Guid? UserId { get; set; }
    public string? Email { get; set; }
    public List<string> RoleList { get; set; } = new();
    public IReadOnlyList<string> Roles => RoleList;
    public string IpAddress { get; set; } = "127.0.0.1";
    public bool IsInRole(string role) => RoleList.Contains(role);
}

public sealed class FakeSignalRealtimeNotifier : ISignalRealtimeNotifier
{
    public Task NotifySignalCreatedAsync(Guid signalId, CancellationToken ct = default) => Task.CompletedTask;
    public Task NotifySignalCountdownAsync(Guid signalId, int secondsRemaining, CancellationToken ct = default) => Task.CompletedTask;
    public Task NotifySignalActivatedAsync(Guid signalId, CancellationToken ct = default) => Task.CompletedTask;
    public Task NotifySignalResultAsync(Guid signalId, SignalStatus outcome, CancellationToken ct = default) => Task.CompletedTask;
    public Task NotifyCandleUpdateAsync(Guid tradingPairId, object candle, CancellationToken ct = default) => Task.CompletedTask;
    public Task NotifyProviderHealthAsync(object health, CancellationToken ct = default) => Task.CompletedTask;
    public Task NotifyAnnouncementAsync(Guid announcementId, CancellationToken ct = default) => Task.CompletedTask;
}

/// <summary>Builds a self-contained DI container (InMemory EF Core + ASP.NET Core Identity) so
/// Infrastructure services can be unit-tested without a real Postgres database or HTTP host.</summary>
public static class TestServiceProviderFactory
{
    public static ServiceProvider Create(string? databaseName = null)
    {
        var services = new ServiceCollection();

        services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName ?? Guid.NewGuid().ToString()));

        services.AddLogging();

        services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 3;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.Configure<JwtSettings>(o =>
        {
            o.Secret = "test-secret-key-at-least-32-characters-long-for-hmac-sha256";
            o.Issuer = "FlexXSignal.Tests";
            o.Audience = "FlexXSignal.Tests.Client";
            o.AccessTokenMinutes = 15;
            o.RefreshTokenDays = 14;
        });

        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IDateTimeProvider, DateTimeProvider>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddSingleton<ICurrentUserService>(new FakeCurrentUserService { Email = "test@flexxsignal.local" });
        services.AddSingleton<ISignalRealtimeNotifier, FakeSignalRealtimeNotifier>();

        return services.BuildServiceProvider();
    }

    public static async Task SeedRolesAsync(ServiceProvider provider)
    {
        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }
    }
}
