using JxFinance.Domain.Budgets;

namespace JxFinance.Endpoints.Budgets.Shared;

public sealed record BudgetSuggestionsResponse(BudgetPeriod Period, IReadOnlyList<BudgetSuggestionResponse> Categories);
