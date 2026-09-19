using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed record CreateBudgetRequest(Guid CategoryId, [property: Money] decimal LimitAmount);
