using JxFinance.Domain.Budgets;

namespace JxFinance.Endpoints.Budgets.GetBudgetSuggestions;

public sealed class GetBudgetSuggestionsRequest
{
    public BudgetPeriod Period { get; init; }
}
