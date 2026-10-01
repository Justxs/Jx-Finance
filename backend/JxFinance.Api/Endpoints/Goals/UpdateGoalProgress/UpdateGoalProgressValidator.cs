using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Goals.UpdateGoalProgress;

public sealed class UpdateGoalProgressValidator : Validator<UpdateGoalProgressRequest>
{
    public UpdateGoalProgressValidator()
    {
        RuleFor(r => r.CurrentAmount)
            .IsNonNegativeMoney()
            .WithMessage("Current amount must be a non-negative decimal with at most 2 decimal places.");
        RuleFor(r => r.CurrentAmount)
            .IsPresent()
            .WithMessage("Send currentAmount to set the progress or delta to add to it.")
            .When(r => r.Delta is null);
        RuleFor(r => r.Delta)
            .IsMoney()
            .WithMessage("Delta must be a decimal with at most 2 decimal places.");
        RuleFor(r => r.Delta)
            .IsAbsent()
            .WithMessage("Send either currentAmount or delta, not both.")
            .When(r => r.CurrentAmount is not null);
    }
}
