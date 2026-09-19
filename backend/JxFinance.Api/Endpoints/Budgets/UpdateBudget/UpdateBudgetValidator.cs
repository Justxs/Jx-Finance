using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed class UpdateBudgetValidator : Validator<UpdateBudgetRequest>
{
    public UpdateBudgetValidator()
    {
        RuleFor(r => r.CategoryId).IsRequired();
        RuleFor(r => r.LimitAmount)
            .IsPositiveMoney()
            .WithMessage("Limit must be a positive decimal with at most 2 decimal places.");
    }
}
