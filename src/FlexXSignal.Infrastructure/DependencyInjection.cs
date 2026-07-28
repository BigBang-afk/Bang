using System.Text;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Auth;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Infrastructure.Identity;
using FlexXSignal.Infrastructure.MarketDataProviders;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.Infrastructure.Security;
using FlexXSignal.Infrastructure.Services;
using FlexXSignal.SignalEngine.Engine;
using FlexXSignal.SignalEngine.Strategies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace FlexXSignal.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Missing 'ConnectionStrings:Default'.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));

        var redisConnectionString = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnectionString;
                options.InstanceName = "flexxsignal:";
            });
        }
        else
        {
            // Local development without Redis running still works; caching just becomes in-process.
            services.AddDistributedMemoryCache();
        }

        services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        var jwtSettings = configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                    ClockSkew = TimeSpan.FromSeconds(30)
                };

                // Allow SignalR clients to send the JWT via the access_token query string on the hub URL.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IDateTimeProvider, DateTimeProvider>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IAuthService, AuthService>();

        services.AddDataProtection();
        services.AddSingleton<IApiKeyProtector, ApiKeyProtector>();

        services.AddSingleton<DemoMarketDataProvider>();
        services.AddSingleton<CsvMarketDataProvider>();
        services.AddSingleton<AuthorizedWebSocketDataProvider>();
        services.AddHttpClient<AuthorizedRestDataProvider>();
        services.AddScoped<IMarketDataProviderResolver, MarketDataProviderResolver>();

        services.AddSingleton<ITradingStrategy, MomentumContinuationStrategy>();
        services.AddSingleton<ITradingStrategy, BreakoutRetestStrategy>();
        services.AddSingleton<ITradingStrategy, LiquiditySweepReversalStrategy>();
        services.AddSingleton<ITradingStrategy, TrendPullbackStrategy>();
        services.AddSingleton<ITradingStrategy, SupportResistanceRejectionStrategy>();
        services.AddSingleton<ITradingStrategy, CandlePressureSequenceStrategy>();
        services.AddSingleton<ITradingStrategy, MultiTimeframeTrendConfirmationStrategy>();
        services.AddSingleton<SignalEngineOrchestrator>();

        services.AddScoped<SubscriptionAccessService>();
        services.AddScoped<Application.Features.MarketData.IMarketDataService, MarketDataService>();
        services.AddScoped<Application.Features.Strategies.IStrategyService, StrategyService>();
        services.AddScoped<Application.Features.Signals.ISignalService, SignalService>();
        services.AddScoped<Application.Features.Backtesting.IBacktestService, BacktestService>();
        services.AddScoped<Application.Features.Subscriptions.ISubscriptionService, SubscriptionService>();
        services.AddScoped<Application.Features.Notifications.INotificationService, NotificationService>();
        services.AddScoped<Application.Features.Support.ISupportTicketService, SupportTicketService>();
        services.AddScoped<Application.Features.Admin.IAdminService, AdminService>();
        services.AddScoped<IPaymentProvider, Payments.ManualPaymentProvider>();
        services.AddScoped<IEmailSender, Notifications.ConsoleEmailSender>();
        services.AddScoped<ITelegramSender, Notifications.TelegramSender>();
        services.AddHttpClient<Notifications.TelegramSender>();

        return services;
    }
}
