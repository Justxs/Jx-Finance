using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Budgets.Shared;

public abstract class BudgetInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IBudgetInput
{
    protected BudgetInputValidator()
    {
        RuleFor(r => r)
            .Must(r => (r.CategoryId is null) != (r.TagId is null))
            .WithErrorCode(ErrorCodes.Required)
            .WithMessage("A budget follows either a category or a tag, never both.")
            .WithName(nameof(IBudgetInput.CategoryId));
        RuleFor(r => r.Period).IsKnownEnum();
        RuleFor(r => r.LimitAmount)
            .IsPositiveMoney()
            .WithMessage("Limit must be a positive decimal with at most 2 decimal places.");
    }
}
