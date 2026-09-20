using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.UpdateGoal;

public sealed class UpdateGoalValidator : GoalInputValidator<UpdateGoalRequest>
{
    public UpdateGoalValidator()
    {
        RuleFor(r => r.CurrentAmount).IsPresent().WithMessage("Current amount is required.");
    }
}
