namespace JxFinance.Endpoints.Budgets.UpdateBudget;

public sealed record UpdateBudgetRequest(Guid Id, Guid CategoryId, string LimitAmount);
