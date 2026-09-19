using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed record UpdateBudgetRequest(Guid Id, Guid CategoryId, [property: Money] decimal LimitAmount);
