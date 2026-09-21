using JxFinance.Common.Json;
using JxFinance.Domain.Budgets;

namespace JxFinance.Endpoints.Budgets.Shared;

public sealed record BudgetResponse(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    [property: Money] decimal LimitAmount,
    [property: Money] decimal CarriedAmount,
    [property: Money] decimal EffectiveLimit,
    [property: Money] decimal Spent,
    [property: Money] decimal Remaining,
    BudgetPeriod Period,
    bool RolloverEnabled,
    DateOnly WindowStart,
    DateOnly WindowEnd);
