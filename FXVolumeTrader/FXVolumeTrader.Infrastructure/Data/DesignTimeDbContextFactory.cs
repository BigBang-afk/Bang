using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FXVolumeTrader.Infrastructure.Data;

/// <summary>
/// Lets EF Core tooling (`dotnet ef migrations add`, `dotnet ef database update`)
/// create an ApplicationDbContext at design time without booting the WPF app
/// or its generic host - useful because FXVolumeTrader.App is a Windows-only
/// target and can't run its design-time build on non-Windows CI/tooling
/// machines. The connection string here is only used for generating
/// migrations; the running application always uses the one from
/// appsettings.json (see App.xaml.cs).
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseSqlite("Data Source=fxvolumetrader.design.db");
        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
