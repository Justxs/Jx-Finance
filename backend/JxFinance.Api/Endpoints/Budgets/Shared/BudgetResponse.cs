using JxFinance.Common.Json;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Budgets.Shared;

public sealed record BudgetResponse(
    Guid Id,
    Guid? CategoryId,
    Guid? TagId,
    string Name,
    [property: Money] decimal LimitAmount,
    [property: Money] decimal CarriedAmount,
    [property: Money] decimal EffectiveLimit,
    [property: Money] decimal Spent,
    [property: Money] decimal Remaining,
    BudgetPeriod Period,
    bool RolloverEnabled,
    DateOnly WindowStart,
    DateOnly WindowEnd,
    Scope Scope,
    Guid? HouseholdId,
    bool IsMine,
    uint Version);
