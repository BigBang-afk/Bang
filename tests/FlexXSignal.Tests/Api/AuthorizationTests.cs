using System.Net;
using System.Net.Http.Json;
using FlexXSignal.Application.Features.Auth;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace FlexXSignal.Tests.Api;

/// <summary>End-to-end checks that unauthenticated and under-privileged requests are actually
/// rejected by the running API pipeline (JWT auth + role-based authorization), not just by
/// convention in the controller code.</summary>
public class AuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public AuthorizationTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task AdminDashboard_WithoutToken_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/admin/dashboard");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminDashboard_AsFreeUser_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var email = $"authz-{Guid.NewGuid():N}@example.com";
        var register = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, "StrongPass1", "Authz Test User", "en"));
        register.EnsureSuccessStatusCode();
        var auth = await register.Content.ReadFromJsonAsync<AuthResponse>();

        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        var response = await client.GetAsync("/api/admin/dashboard");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task HealthEndpoint_IsPubliclyAccessible()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Signals_Live_IsPubliclyAccessible()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/signals/live");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
