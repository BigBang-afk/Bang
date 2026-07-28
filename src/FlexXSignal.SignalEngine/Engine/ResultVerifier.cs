using FlexXSignal.Domain.Enums;

namespace FlexXSignal.SignalEngine.Engine;

/// <summary>
/// Pure, side-effect-free implementation of the documented result rules:
/// UP wins when expiration price &gt; entry price, DOWN wins when expiration price &lt; entry price,
/// and either direction ties when the prices are equal. Shared by the live ResultVerificationService
/// and the backtesting engine so both paths can never disagree on the definition of a win.
/// </summary>
public static class ResultVerifier
{
    public static SignalStatus Verify(SignalDirection direction, decimal entryPrice, decimal expirationPrice)
    {
        if (entryPrice == expirationPrice) return SignalStatus.Tie;

        return direction == SignalDirection.Up
            ? (expirationPrice > entryPrice ? SignalStatus.Win : SignalStatus.Loss)
            : (expirationPrice < entryPrice ? SignalStatus.Win : SignalStatus.Loss);
    }
}
