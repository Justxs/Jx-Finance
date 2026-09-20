using JxFinance.Common.Json;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed record UpdateBudgetRequest(Guid Id, Guid CategoryId, [property: Money] decimal LimitAmount) : IBudgetInput;
