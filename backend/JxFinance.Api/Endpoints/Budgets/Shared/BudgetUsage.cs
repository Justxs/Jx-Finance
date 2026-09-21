using JxFinance.Domain.Budgets;

namespace JxFinance.Endpoints.Budgets.Shared;

public sealed record BudgetUsage(BudgetWindow Window, decimal Carried, decimal Spent);
