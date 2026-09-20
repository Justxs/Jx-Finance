using JxFinance.Common.Json;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed record CreateBudgetRequest(Guid CategoryId, [property: Money] decimal LimitAmount) : IBudgetInput;
