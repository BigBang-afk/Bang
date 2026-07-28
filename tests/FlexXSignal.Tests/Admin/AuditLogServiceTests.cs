using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using FlexXSignal.Infrastructure.Services;
using FlexXSignal.Tests.TestSupport;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FlexXSignal.Tests.Admin;

public class AuditLogServiceTests
{
    [Fact]
    public async Task LogAsync_WritesAuditEntryWithOldAndNewValues()
    {
        var provider = TestServiceProviderFactory.Create();
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();

        var currentUser = (FakeCurrentUserService)provider.GetRequiredService<Application.Common.Interfaces.ICurrentUserService>();
        currentUser.UserId = Guid.NewGuid();
        currentUser.Email = "admin@flexxsignal.local";

        var clock = scope.ServiceProvider.GetRequiredService<Application.Common.Interfaces.IDateTimeProvider>();
        var service = new AuditLogService(db, currentUser, clock);

        var entityId = Guid.NewGuid().ToString();
        await service.LogAsync(AuditAction.ManualSignalResultCorrection, "SignalResult", entityId,
            new { Outcome = "Loss" }, new { Outcome = "Win" }, "Verified provider outage caused a false loss reading.");

        var entry = db.AuditLogs.Single();
        entry.Action.Should().Be(AuditAction.ManualSignalResultCorrection);
        entry.EntityId.Should().Be(entityId);
        entry.OldValueJson.Should().Contain("Loss");
        entry.NewValueJson.Should().Contain("Win");
        entry.Reason.Should().NotBeNullOrEmpty();
        entry.ActorUserId.Should().Be(currentUser.UserId);
    }
}
