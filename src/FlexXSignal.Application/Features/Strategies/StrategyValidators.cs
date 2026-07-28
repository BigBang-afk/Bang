using FluentValidation;

namespace FlexXSignal.Application.Features.Strategies;

public sealed class CreateStrategyVersionRequestValidator : AbstractValidator<CreateStrategyVersionRequest>
{
    public CreateStrategyVersionRequestValidator()
    {
        RuleFor(x => x.StrategyId).NotEmpty();
        RuleFor(x => x.MinimumPublishConfidence).InclusiveBetween(0, 100);
        RuleFor(x => x)
            .Must(x => Math.Abs(
                x.WeightTrendAlignment + x.WeightMarketStructure + x.WeightCandlePressure + x.WeightMomentum +
                x.WeightSupportResistance + x.WeightBreakoutRejection + x.WeightMultiTimeframeAgreement +
                x.WeightVolatilityQuality + x.WeightHistoricalPerformance - 100m) < 0.01m)
            .WithMessage("Confidence weights must sum to 100.");
    }
}
