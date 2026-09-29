using JxFinance.Common.Validation;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.CreateSharedExpense;

public sealed class CreateSharedExpenseValidator : SharedExpenseInputValidator<CreateSharedExpenseRequest>
{
    public CreateSharedExpenseValidator()
    {
        RuleFor(r => r.TransactionId).IsRequired();
    }
}
