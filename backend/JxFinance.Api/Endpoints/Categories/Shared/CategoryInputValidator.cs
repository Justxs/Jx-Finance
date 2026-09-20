using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.Shared;

public abstract class CategoryInputValidator<TRequest> : Validator<TRequest>
    where TRequest : ICategoryInput
{
    protected CategoryInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.Icon).HasMaxLength(50);
        RuleFor(r => r.HouseholdId)
            .NotNull()
            .WithErrorCode(ErrorCodes.HouseholdRequired)
            .WithMessage("A shared category needs a household.")
            .When(r => r.Scope == Scope.Shared);
    }
}
