using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Goals.Shared;

public abstract class GoalInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IGoalInput
{
    protected GoalInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.TargetAmount)
            .IsPositiveMoney()
            .WithMessage("Target amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.CurrentAmount)
            .IsNonNegativeMoney()
            .WithMessage("Current amount must be a non-negative decimal with at most 2 decimal places.");
    }
}
