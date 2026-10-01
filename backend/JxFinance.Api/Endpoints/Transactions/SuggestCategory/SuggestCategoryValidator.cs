using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Transactions.SuggestCategory;

public sealed class SuggestCategoryValidator : Validator<SuggestCategoryRequest>
{
    public SuggestCategoryValidator()
    {
        RuleFor(r => r.AccountId).IsRequired();
        RuleFor(r => r.Type).IsKnownEnum();
        RuleFor(r => r.Amount).IsNonNegativeMoney();
        RuleFor(r => r.Description).IsRequired().HasMaxLength(500);
    }
}
