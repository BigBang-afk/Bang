using FXVolumeTrader.Infrastructure.Data;
using FXVolumeTrader.Infrastructure.Data.Entities;
using FXVolumeTrader.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace FXVolumeTrader.Tests;

public class RepositoryTests
{
    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var context = new ApplicationDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task AddAsync_ThenSaveChanges_PersistsEntity()
    {
        using var context = CreateContext();
        var repository = new Repository<RiskEvent>(context);

        var riskEvent = new RiskEvent
        {
            EventType = Core.Enums.RiskEventType.EmergencyStopActivated,
            Description = "Test event",
            OccurredAtUtc = DateTime.UtcNow
        };

        await repository.AddAsync(riskEvent);
        await repository.SaveChangesAsync();

        var all = await repository.GetAllAsync();
        Assert.Single(all);
    }

    [Fact]
    public async Task Remove_ThenSaveChanges_DeletesEntity()
    {
        using var context = CreateContext();
        var repository = new Repository<RiskEvent>(context);

        var riskEvent = new RiskEvent
        {
            EventType = Core.Enums.RiskEventType.DailyLossLimitReached,
            Description = "To be removed",
            OccurredAtUtc = DateTime.UtcNow
        };

        await repository.AddAsync(riskEvent);
        await repository.SaveChangesAsync();

        repository.Remove(riskEvent);
        await repository.SaveChangesAsync();

        var all = await repository.GetAllAsync();
        Assert.Empty(all);
    }
}
