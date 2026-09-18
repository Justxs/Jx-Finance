using FastEndpoints;
using FluentValidation;
using JxFinance.Common;

namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed class CreateBudgetValidator : Validator<CreateBudgetRequest>
{
    public CreateBudgetValidator()
    {
        RuleFor(r => r.CategoryId).NotEmpty();
        RuleFor(r => r.LimitAmount)
            .Must(MoneyWire.IsPositive)
            .WithMessage("Limit must be a positive decimal with at most 2 decimal places.");
    }
}
