using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Budgets.Shared;

public sealed record BudgetWindowSpend(DateOnly Start, DateOnly End, [property: Money] decimal Spent);
