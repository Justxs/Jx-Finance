using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Domain.Goals;

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
        RuleFor(r => r.Funding).IsKnownEnum();
        RuleFor(r => r.FundingSharePercent)
            .IsWithin(1, 100)
            .WithMessage("The funded share must be a whole percentage from 1 to 100.");
        RuleFor(r => r.FundingAccountId)
            .IsPresent()
            .WithMessage("A goal funded from an account needs that account.")
            .When(r => r.Funding == GoalFunding.Account);
        RuleFor(r => r.FundingAccountId)
            .IsAbsent()
            .WithMessage("A goal with manual progress cannot name a funding account.")
            .When(r => r.Funding == GoalFunding.Manual);
    }
}
