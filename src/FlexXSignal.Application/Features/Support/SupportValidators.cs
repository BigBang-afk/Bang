using FluentValidation;

namespace FlexXSignal.Application.Features.Support;

public sealed class CreateSupportTicketRequestValidator : AbstractValidator<CreateSupportTicketRequest>
{
    public CreateSupportTicketRequestValidator()
    {
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Category).NotEmpty();
        RuleFor(x => x.Message).NotEmpty().MaximumLength(5000);
    }
}

public sealed class AddSupportMessageRequestValidator : AbstractValidator<AddSupportMessageRequest>
{
    public AddSupportMessageRequestValidator()
    {
        RuleFor(x => x.Message).NotEmpty().MaximumLength(5000);
    }
}
