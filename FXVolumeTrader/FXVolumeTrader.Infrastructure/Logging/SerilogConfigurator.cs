using Microsoft.Extensions.Configuration;
using Serilog;

namespace FXVolumeTrader.Infrastructure.Logging;

/// <summary>
/// Builds the application-wide Serilog logger from appsettings.json.
/// Called once from App.xaml.cs before the generic host is built, so
/// startup failures are logged too.
/// </summary>
public static class SerilogConfigurator
{
    public static Serilog.ILogger CreateLogger(IConfiguration configuration)
    {
        return new LoggerConfiguration()
            .ReadFrom.Configuration(configuration)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Application", "FXVolumeTrader")
            .CreateLogger();
    }
}
