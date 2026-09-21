using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Tags.Shared;

public abstract class TagInputValidator<TRequest> : Validator<TRequest>
    where TRequest : ITagInput
{
    public const int NameMaxLength = 50;

    protected TagInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(NameMaxLength);
        RuleFor(r => r.HouseholdId)
            .NotNull()
            .WithErrorCode(ErrorCodes.HouseholdRequired)
            .WithMessage("A shared tag needs a household.")
            .When(r => r.Scope == Scope.Shared);
    }
}
