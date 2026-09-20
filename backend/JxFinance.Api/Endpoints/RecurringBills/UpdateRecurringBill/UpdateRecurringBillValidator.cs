using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed class UpdateRecurringBillValidator : RecurringBillInputValidator<UpdateRecurringBillRequest>
{
    public UpdateRecurringBillValidator()
    {
        RuleFor(r => r.Amount).IsAbsent().When(r => r.Kind == RecurringBillKind.Variable);
    }
}
