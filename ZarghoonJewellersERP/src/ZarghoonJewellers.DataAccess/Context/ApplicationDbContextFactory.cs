using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ZarghoonJewellers.DataAccess.Context;

/// <summary>
/// Design-time factory so `dotnet ef migrations add ...` / `dotnet ef database update`
/// can construct the context without going through the WinForms host's DI container.
/// Not used at application runtime - Program.cs in the Presentation project wires up the
/// real connection string via configuration.
/// </summary>
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        const string designTimeConnectionString =
            "Server=.\\SQLEXPRESS;Database=ZarghoonJewellersDB;Trusted_Connection=True;TrustServerCertificate=True;";

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseSqlServer(designTimeConnectionString);

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
