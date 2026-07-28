using FlexXSignal.Domain.Enums;
using FlexXSignal.SignalEngine.Engine;
using FluentAssertions;
using Xunit;

namespace FlexXSignal.Tests.SignalEngine;

public class ResultVerifierTests
{
    [Theory]
    [InlineData(SignalDirection.Up, 1.1000, 1.1010, SignalStatus.Win)]
    [InlineData(SignalDirection.Up, 1.1000, 1.0990, SignalStatus.Loss)]
    [InlineData(SignalDirection.Up, 1.1000, 1.1000, SignalStatus.Tie)]
    [InlineData(SignalDirection.Down, 1.1000, 1.0990, SignalStatus.Win)]
    [InlineData(SignalDirection.Down, 1.1000, 1.1010, SignalStatus.Loss)]
    [InlineData(SignalDirection.Down, 1.1000, 1.1000, SignalStatus.Tie)]
    public void Verify_FollowsDocumentedUpDownRules(SignalDirection direction, decimal entry, decimal expiration, SignalStatus expected)
    {
        var result = ResultVerifier.Verify(direction, entry, expiration);
        result.Should().Be(expected);
    }
}
