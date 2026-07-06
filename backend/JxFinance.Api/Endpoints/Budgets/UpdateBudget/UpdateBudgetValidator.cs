using FastEndpoints;
using FluentValidation;
using JxFinance.Common;

namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed class UpdateBudgetValidator : Validator<UpdateBudgetRequest>
{
    public UpdateBudgetValidator()
    {
        RuleFor(r => r.CategoryId).NotEmpty();
        RuleFor(r => r.LimitAmount)
            .Must(amount => MoneyWire.IsValid(amount) && MoneyWire.Parse(amount).Amount > 0)
            .WithMessage("Limit must be a positive decimal with at most 2 decimal places.");
    }
}
