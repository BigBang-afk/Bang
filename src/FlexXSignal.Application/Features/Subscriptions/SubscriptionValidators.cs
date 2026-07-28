using FluentValidation;

namespace FlexXSignal.Application.Features.Subscriptions;

public sealed class SubmitPaymentRequestValidator : AbstractValidator<SubmitPaymentRequest>
{
    public SubmitPaymentRequestValidator()
    {
        RuleFor(x => x.SubscriptionPlanId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Currency).NotEmpty().Length(3);
        RuleFor(x => x.ReferenceCode).NotEmpty();
        RuleFor(x => x.BillingCycle).Must(c => c is "Monthly" or "Annual");
    }
}

public sealed class UpsertSubscriptionPlanRequestValidator : AbstractValidator<UpsertSubscriptionPlanRequest>
{
    public UpsertSubscriptionPlanRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.MonthlyPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.AnnualPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.MaxSignalsPerDay).GreaterThanOrEqualTo(0);
        RuleFor(x => x.SignalHistoryDays).GreaterThanOrEqualTo(0);
    }
}
