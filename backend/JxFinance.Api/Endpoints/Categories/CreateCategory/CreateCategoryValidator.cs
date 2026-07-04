using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Categories.CreateCategory;

public sealed class CreateCategoryValidator : Validator<CreateCategoryRequest>
{
    public CreateCategoryValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.Icon).MaximumLength(50);
    }
}
