namespace FlexXSignal.Api.BackgroundServices;

/// <summary>Base class for background jobs that run on a fixed interval, each tick isolated in a
/// try/catch so one failing iteration never crashes the whole hosted service.</summary>
public abstract class TimedBackgroundService : BackgroundService
{
    private readonly ILogger _logger;
    protected abstract TimeSpan Interval { get; }

    protected TimedBackgroundService(ILogger logger) => _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        do
        {
            try
            {
                await TickAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // expected on shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "{Service} tick failed.", GetType().Name);
            }
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    protected abstract Task TickAsync(CancellationToken ct);
}
