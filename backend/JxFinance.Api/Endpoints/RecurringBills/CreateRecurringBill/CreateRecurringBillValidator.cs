using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed class CreateRecurringBillValidator : RecurringBillInputValidator<CreateRecurringBillRequest>
{
    public CreateRecurringBillValidator()
    {
        RuleFor(r => r.Amount)
            .Must(a => a is null)
            .WithErrorCode(ErrorCodes.ValueMustBeEmpty)
            .WithMessage("A variable bill's amount is entered when it's confirmed, not set upfront.")
            .When(r => r.Kind == RecurringBillKind.Variable);
    }
}
