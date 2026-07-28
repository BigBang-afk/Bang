using FlexXSignal.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace FlexXSignal.Infrastructure.Notifications;

/// <summary>
/// Development-mode email sender: logs the message instead of dispatching it, so local/demo
/// environments never require real SMTP credentials. Swap for an SMTP/SendGrid implementation of
/// IEmailSender in production by registering it in DependencyInjection.
/// </summary>
public sealed class ConsoleEmailSender : IEmailSender
{
    private readonly ILogger<ConsoleEmailSender> _logger;
    public ConsoleEmailSender(ILogger<ConsoleEmailSender> logger) => _logger = logger;

    public Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
    {
        _logger.LogInformation("[DEV EMAIL] To: {ToEmail} | Subject: {Subject}", toEmail, subject);
        return Task.CompletedTask;
    }
}
