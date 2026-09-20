using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public abstract class RecurringBillInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IRecurringBillInput
{
    protected RecurringBillInputValidator()
    {
        RuleFor(r => r.Kind).IsKnownEnum();
        RuleFor(r => r.Cadence).IsKnownEnum();
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.RemindDaysBefore).IsWithin(0, 365);
        RuleFor(r => r.NextDueDate).IsRequired();
        RuleFor(r => r.Amount)
            .IsPositiveMoney()
            .WithMessage("Amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.Amount)
            .IsPresent()
            .WithMessage("A fixed bill must have an amount.")
            .When(r => r.Kind == RecurringBillKind.Fixed);
    }
}
