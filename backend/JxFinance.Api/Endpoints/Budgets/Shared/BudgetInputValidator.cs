using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Budgets.Shared;

public abstract class BudgetInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IBudgetInput
{
    protected BudgetInputValidator()
    {
        RuleFor(r => r.CategoryId).IsRequired();
        RuleFor(r => r.LimitAmount)
            .IsPositiveMoney()
            .WithMessage("Limit must be a positive decimal with at most 2 decimal places.");
    }
}
