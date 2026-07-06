using FastEndpoints;
using FluentValidation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.UpdateCategory;

public sealed class UpdateCategoryValidator : Validator<UpdateCategoryRequest>
{
    public UpdateCategoryValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.Icon).MaximumLength(50);
        RuleFor(r => r.HouseholdId)
            .NotNull()
            .WithMessage("A shared category needs a household.")
            .When(r => r.Scope == Scope.Shared);
    }
}
