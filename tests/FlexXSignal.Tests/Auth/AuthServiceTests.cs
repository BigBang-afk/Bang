using FlexXSignal.Application.Features.Auth;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.Infrastructure.Services;
using FlexXSignal.Tests.TestSupport;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FlexXSignal.Tests.Auth;

public class AuthServiceTests
{
    private static async Task<(ServiceProvider Provider, AuthService Service)> CreateAsync()
    {
        var provider = TestServiceProviderFactory.Create();
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();
        await TestServiceProviderFactory.SeedRolesAsync(provider);

        var service = ActivatorUtilities.CreateInstance<AuthService>(provider);
        return (provider, service);
    }

    [Fact]
    public async Task RegisterAsync_ValidRequest_CreatesUserAndReturnsTokens()
    {
        var (_, service) = await CreateAsync();
        var request = new RegisterRequest("newuser@example.com", "StrongPass1", "New User", "en");

        var result = await service.RegisterAsync(request);

        result.Succeeded.Should().BeTrue();
        result.Value!.Email.Should().Be("newuser@example.com");
        result.Value.Roles.Should().Contain("FreeUser");
        result.Value.AccessToken.Should().NotBeNullOrEmpty();
        result.Value.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_Fails()
    {
        var (_, service) = await CreateAsync();
        var request = new RegisterRequest("dupe@example.com", "StrongPass1", "User One", "en");
        await service.RegisterAsync(request);

        var result = await service.RegisterAsync(request);

        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task LoginAsync_CorrectPassword_Succeeds()
    {
        var (_, service) = await CreateAsync();
        await service.RegisterAsync(new RegisterRequest("login@example.com", "StrongPass1", "Login User", "en"));

        var result = await service.LoginAsync(new LoginRequest("login@example.com", "StrongPass1"));

        result.Succeeded.Should().BeTrue();
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_Fails()
    {
        var (_, service) = await CreateAsync();
        await service.RegisterAsync(new RegisterRequest("login2@example.com", "StrongPass1", "Login User", "en"));

        var result = await service.LoginAsync(new LoginRequest("login2@example.com", "WrongPassword1"));

        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task LoginAsync_RepeatedFailures_LocksAccount()
    {
        var (_, service) = await CreateAsync();
        await service.RegisterAsync(new RegisterRequest("lockout@example.com", "StrongPass1", "Lockout User", "en"));

        for (var i = 0; i < 3; i++)
            await service.LoginAsync(new LoginRequest("lockout@example.com", "WrongPassword1"));

        var result = await service.LoginAsync(new LoginRequest("lockout@example.com", "StrongPass1"));

        result.Succeeded.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("locked"));
    }

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_IssuesNewTokenAndRevokesOld()
    {
        var (_, service) = await CreateAsync();
        var registerResult = await service.RegisterAsync(new RegisterRequest("refresh@example.com", "StrongPass1", "Refresh User", "en"));

        var refreshed = await service.RefreshTokenAsync(registerResult.Value!.RefreshToken);

        refreshed.Succeeded.Should().BeTrue();
        refreshed.Value!.RefreshToken.Should().NotBe(registerResult.Value.RefreshToken);

        var reused = await service.RefreshTokenAsync(registerResult.Value.RefreshToken);
        reused.Succeeded.Should().BeFalse("a rotated refresh token must not be usable again");
    }
}
