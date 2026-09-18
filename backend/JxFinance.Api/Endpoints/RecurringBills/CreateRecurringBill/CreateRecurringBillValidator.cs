using FastEndpoints;
using FluentValidation;
using JxFinance.Common;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed class CreateRecurringBillValidator : Validator<CreateRecurringBillRequest>
{
    public CreateRecurringBillValidator()
    {
        RuleFor(r => r.Kind).IsInEnum();
        RuleFor(r => r.Cadence).IsInEnum();
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.RemindDaysBefore).InclusiveBetween(0, 365);
        RuleFor(r => r.NextDueDate).NotEmpty();
        RuleFor(r => r.Amount)
            .Must(a => a is null || MoneyWire.IsPositive(a))
            .WithMessage("Amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.Amount)
            .NotNull()
            .WithMessage("A fixed bill must have an amount.")
            .When(r => r.Kind == RecurringBillKind.Fixed);
        RuleFor(r => r.Amount)
            .Must(a => a is null)
            .WithMessage("A variable bill's amount is entered when it's confirmed, not set upfront.")
            .When(r => r.Kind == RecurringBillKind.Variable);
    }
}
