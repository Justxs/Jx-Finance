using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.UpdateCategory;

public sealed class UpdateCategoryValidator : Validator<UpdateCategoryRequest>
{
    public UpdateCategoryValidator()
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
