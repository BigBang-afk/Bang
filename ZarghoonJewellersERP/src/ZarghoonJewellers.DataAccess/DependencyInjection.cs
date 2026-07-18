using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Implementations;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;

namespace ZarghoonJewellers.DataAccess;

/// <summary>Composition-root extension so Program.cs only needs one call to wire up EF Core + repositories.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddDataAccess(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure(3)));

        // Scoped: one UnitOfWork (and its underlying DbContext) per form/operation lifetime.
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
