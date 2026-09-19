using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Budgets.Shared;

public sealed record BudgetResponse(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    [property: Money] decimal LimitAmount,
    [property: Money] decimal Spent,
    [property: Money] decimal Remaining,
    string Period);
