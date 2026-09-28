using JxFinance.Domain.Budgets;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.Interfaces;

public interface IBudgetSuggestionService
{
    Task<BudgetSuggestionsResponse> GetAsync(BudgetPeriod period, CancellationToken cancellationToken);
}
