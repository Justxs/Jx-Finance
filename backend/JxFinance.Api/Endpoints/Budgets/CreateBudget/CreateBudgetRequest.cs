namespace JxFinance.Endpoints.Budgets.CreateBudget;

public sealed record CreateBudgetRequest(Guid CategoryId, string LimitAmount);
