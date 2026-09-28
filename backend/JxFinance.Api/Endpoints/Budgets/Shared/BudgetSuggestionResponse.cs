using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Budgets.Shared;

public sealed record BudgetSuggestionResponse(
    Guid CategoryId,
    string CategoryName,
    IReadOnlyList<BudgetWindowSpend> Windows,
    [property: Money] decimal? Median,
    [property: Money] decimal? SuggestedLimit,
    bool IsSteady,
    bool HasBudget);
