using FlexXSignal.Api.Hubs;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Domain.Enums;
using Microsoft.AspNetCore.SignalR;

namespace FlexXSignal.Api.Services;

public sealed class SignalRealtimeNotifier : ISignalRealtimeNotifier
{
    private readonly IHubContext<SignalHub> _hub;

    public SignalRealtimeNotifier(IHubContext<SignalHub> hub) => _hub = hub;

    public Task NotifySignalCreatedAsync(Guid signalId, CancellationToken ct = default) =>
        _hub.Clients.Group(SignalHub.SignalsGroup).SendAsync("NewSignal", new { signalId }, ct);

    public Task NotifySignalCountdownAsync(Guid signalId, int secondsRemaining, CancellationToken ct = default) =>
        _hub.Clients.Group(SignalHub.SignalsGroup).SendAsync("SignalCountdown", new { signalId, secondsRemaining }, ct);

    public Task NotifySignalActivatedAsync(Guid signalId, CancellationToken ct = default) =>
        _hub.Clients.Group(SignalHub.SignalsGroup).SendAsync("SignalActivated", new { signalId }, ct);

    public Task NotifySignalResultAsync(Guid signalId, SignalStatus outcome, CancellationToken ct = default) =>
        _hub.Clients.Group(SignalHub.SignalsGroup).SendAsync("SignalResult", new { signalId, outcome = outcome.ToString() }, ct);

    public Task NotifyCandleUpdateAsync(Guid tradingPairId, object candle, CancellationToken ct = default) =>
        _hub.Clients.All.SendAsync("CandleUpdate", new { tradingPairId, candle }, ct);

    public Task NotifyProviderHealthAsync(object health, CancellationToken ct = default) =>
        _hub.Clients.Group(SignalHub.AdminGroup).SendAsync("ProviderHealth", health, ct);

    public Task NotifyAnnouncementAsync(Guid announcementId, CancellationToken ct = default) =>
        _hub.Clients.All.SendAsync("Announcement", new { announcementId }, ct);
}
