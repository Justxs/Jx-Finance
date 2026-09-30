using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Validation;
using JxFinance.Domain.Payees;

namespace JxFinance.Endpoints.Payees.SetPayeeName;

public sealed class SetPayeeNameValidator : Validator<SetPayeeNameRequest>
{
    public SetPayeeNameValidator()
    {
        RuleFor(r => r.Payee).IsRequired().HasMaxLength(500);
        RuleFor(r => r.Payee)
            .Must(payee => SubscriptionDescription.Normalize(payee) is { Length: > 0 })
            .WithErrorCode(ErrorCodes.TextInvalidFormat)
            .WithMessage("Nothing is left of the payee after normalizing; give a description with letters in it.")
            .When(r => !string.IsNullOrWhiteSpace(r.Payee));
        RuleFor(r => r.Name).IsRequired().HasMaxLength(PayeeName.NameMaxLength);
    }
}
