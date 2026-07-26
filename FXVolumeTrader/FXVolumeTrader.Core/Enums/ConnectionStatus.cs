namespace FXVolumeTrader.Core.Enums;

public enum ConnectionStatus
{
    Disconnected = 0,
    Connecting = 1,
    Connected = 2,
    Delayed = 3,
    Reconnecting = 4,
    Faulted = 5
}
