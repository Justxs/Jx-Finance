using FastEndpoints;
using FluentValidation;
using JxFinance.Common;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed class UpdateRecurringBillValidator : Validator<UpdateRecurringBillRequest>
{
    public UpdateRecurringBillValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.RemindDaysBefore).GreaterThanOrEqualTo(0);
        RuleFor(r => r.NextDueDate).NotEmpty();
        RuleFor(r => r.Amount)
            .Must(a => a is null || (MoneyWire.IsValid(a) && MoneyWire.Parse(a).Amount > 0))
            .WithMessage("Amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.Amount)
            .NotNull()
            .WithMessage("A fixed bill must have an amount.")
            .When(r => r.Kind == RecurringBillKind.Fixed);
    }
}
