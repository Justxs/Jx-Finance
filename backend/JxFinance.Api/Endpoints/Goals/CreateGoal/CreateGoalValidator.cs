using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed class CreateGoalValidator : Validator<CreateGoalRequest>
{
    public CreateGoalValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.TargetAmount)
            .IsPositiveMoney()
            .WithMessage("Target amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.CurrentAmount)
            .IsMoney()
            .WithMessage("Current amount must be a decimal with at most 2 decimal places.");
    }
}
