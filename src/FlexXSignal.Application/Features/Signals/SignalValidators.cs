using FluentValidation;

namespace FlexXSignal.Application.Features.Signals;

public sealed class CreateManualSignalRequestValidator : AbstractValidator<CreateManualSignalRequest>
{
    public CreateManualSignalRequestValidator()
    {
        RuleFor(x => x.PairSymbol).NotEmpty();
        RuleFor(x => x.EntryTimeUtc).GreaterThan(DateTime.UtcNow).WithMessage("Entry time must be in the future.");
        RuleFor(x => x.ConfidencePercent).InclusiveBetween(0, 100);
        RuleFor(x => x.AnalysisExplanationEn).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.StrategyVersionId).NotEmpty();
    }
}

public sealed class CorrectSignalResultRequestValidator : AbstractValidator<CorrectSignalResultRequest>
{
    public CorrectSignalResultRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MinimumLength(10).WithMessage("A detailed reason is required to correct a locked result.");
    }
}
