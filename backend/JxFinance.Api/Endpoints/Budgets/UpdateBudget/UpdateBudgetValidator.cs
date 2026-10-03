using JxFinance.Common.Validation;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed class UpdateBudgetValidator : BudgetInputValidator<UpdateBudgetRequest>
{
    public UpdateBudgetValidator()
    {
        RuleFor(r => r.Version).IsReadVersion();
    }
}
