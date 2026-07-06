using TradingJournal.Core.Services;
using Xunit;

namespace TradingJournal.Tests;

public class CalculationServiceTests
{
    [Fact]
    public void UsdToPkr_MultipliesByRate()
    {
        var pkr = CalculationService.UsdToPkr(100m, 280m);
        Assert.Equal(28000m, pkr);
    }

    [Fact]
    public void PkrToGold_DividesByGoldRate()
    {
        var gold = CalculationService.PkrToGold(25000m, 250000m);
        Assert.Equal(0.1m, gold);
    }

    [Fact]
    public void ConvertUsd_ChainsPkrThenGold()
    {
        var (pkr, gold) = CalculationService.ConvertUsd(100m, 280m, 250000m);

        Assert.Equal(28000m, pkr);
        Assert.Equal(28000m / 250000m, gold);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void UsdToPkr_ThrowsForNonPositiveRate(decimal rate)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => CalculationService.UsdToPkr(100m, rate));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void PkrToGold_ThrowsForNonPositiveGoldRate(decimal goldRate)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => CalculationService.PkrToGold(1000m, goldRate));
    }
}
