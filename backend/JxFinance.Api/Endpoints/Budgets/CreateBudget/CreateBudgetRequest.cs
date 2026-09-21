using JxFinance.Common.Json;
using JxFinance.Domain.Budgets;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed record CreateBudgetRequest(
    Guid CategoryId,
    [property: Money] decimal LimitAmount,
    BudgetPeriod Period,
    bool RolloverEnabled) : IBudgetInput;
