using FastEndpoints;
using JxFinance.Common.Sharing;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Categories.Shared;

public abstract class CategoryInputValidator<TRequest> : Validator<TRequest>
    where TRequest : ICategoryInput
{
    protected CategoryInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.Icon).HasMaxLength(50);
        RuleFor(r => r.HouseholdId).RequiresHouseholdWhenShared("category");
    }
}
