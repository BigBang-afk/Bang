using FXVolumeTrader.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace FXVolumeTrader.Tests;

/// <summary>
/// Verifies the model builds correctly and seed data is present, using
/// the EF Core InMemory provider so no SQLite file/migration is needed
/// to run this test.
/// </summary>
public class ApplicationDbContextTests
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
    public void SeedData_PopulatesDefaultAppSettings()
    {
        using var context = CreateContext();

        Assert.True(context.AppSettings.Any());
        Assert.Contains(context.AppSettings, s => s.Key == "Risk.MaxDailyLoss");
    }

    [Fact]
    public void SeedData_PopulatesDefaultStrategyConfiguration()
    {
        using var context = CreateContext();

        var config = Assert.Single(context.StrategyConfigurations);
        Assert.True(config.IsActive);
        Assert.Equal("1.0.0", config.Version);
    }
}
