using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Categories.UpdateCategory;

public sealed class UpdateCategoryValidator : Validator<UpdateCategoryRequest>
{
    public UpdateCategoryValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.Icon).MaximumLength(50);
    }
}
