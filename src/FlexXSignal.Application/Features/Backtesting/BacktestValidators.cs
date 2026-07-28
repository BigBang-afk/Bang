using FluentValidation;

namespace FlexXSignal.Application.Features.Backtesting;

public sealed class RunBacktestRequestValidator : AbstractValidator<RunBacktestRequest>
{
    public RunBacktestRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.TradingPairId).NotEmpty();
        RuleFor(x => x.StrategyVersionId).NotEmpty();
        RuleFor(x => x.InSampleEndUtc).GreaterThan(x => x.InSampleStartUtc);
        RuleFor(x => x.ConfidenceThresholdOverride).InclusiveBetween(0, 100);
        When(x => x.OutOfSampleStartUtc.HasValue || x.OutOfSampleEndUtc.HasValue, () =>
        {
            RuleFor(x => x.OutOfSampleStartUtc).NotNull();
            RuleFor(x => x.OutOfSampleEndUtc).NotNull().GreaterThan(x => x.OutOfSampleStartUtc);
        });
        RuleFor(x => x.WalkForwardFolds).GreaterThanOrEqualTo(1);
    }
}
