using Microsoft.AspNetCore.SignalR;

namespace FlexXSignal.Api.Hubs;

/// <summary>
/// Single real-time hub for the platform. Clients join topic groups (e.g. "signals", a specific
/// signal id for countdown updates, or a trading pair for candle streams) and the server pushes
/// typed events: NewSignal, SignalCountdown, SignalActivated, SignalResult, CandleUpdate,
/// ProviderHealth, Announcement.
/// </summary>
public sealed class SignalHub : Hub
{
    public const string SignalsGroup = "signals";
    public const string AdminGroup = "admin";

    public async Task JoinSignalsGroup() => await Groups.AddToGroupAsync(Context.ConnectionId, SignalsGroup);

    public async Task JoinPairGroup(string pairSymbol) => await Groups.AddToGroupAsync(Context.ConnectionId, PairGroup(pairSymbol));

    public async Task LeavePairGroup(string pairSymbol) => await Groups.RemoveFromGroupAsync(Context.ConnectionId, PairGroup(pairSymbol));

    public static string PairGroup(string pairSymbol) => $"pair:{pairSymbol}";
}
