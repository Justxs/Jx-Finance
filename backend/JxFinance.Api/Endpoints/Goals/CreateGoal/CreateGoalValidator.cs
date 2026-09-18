using FastEndpoints;
using FluentValidation;
using JxFinance.Common;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed class CreateGoalValidator : Validator<CreateGoalRequest>
{
    public CreateGoalValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.TargetAmount)
            .Must(MoneyWire.IsPositive)
            .WithMessage("Target amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.CurrentAmount)
            .Must(amount => amount is null || MoneyWire.IsValid(amount))
            .WithMessage("Current amount must be a decimal with at most 2 decimal places.");
    }
}
