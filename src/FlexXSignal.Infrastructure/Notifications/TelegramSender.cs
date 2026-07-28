using FlexXSignal.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FlexXSignal.Infrastructure.Notifications;

/// <summary>
/// Template Telegram Bot API sender. Fully wired to call the standard Bot API sendMessage
/// endpoint; only a bot token needs to be supplied via configuration (Telegram:BotToken) for
/// this to become live. Falls back to a logged no-op when no token is configured.
/// </summary>
public sealed class TelegramSender : ITelegramSender
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TelegramSender> _logger;
    private readonly string? _botToken;

    public TelegramSender(HttpClient httpClient, IConfiguration configuration, ILogger<TelegramSender> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _botToken = configuration["Telegram:BotToken"];
    }

    public async Task SendAsync(string chatId, string message, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_botToken))
        {
            _logger.LogInformation("[DEV TELEGRAM] To chat {ChatId}: {Message}", chatId, message);
            return;
        }

        var url = $"https://api.telegram.org/bot{_botToken}/sendMessage";
        var payload = new Dictionary<string, string> { ["chat_id"] = chatId, ["text"] = message };

        try
        {
            using var response = await _httpClient.PostAsync(url, new FormUrlEncodedContent(payload), ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Telegram send failed with status {Status}.", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Telegram send threw an exception.");
        }
    }
}
