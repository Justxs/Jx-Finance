namespace JxFinance.Endpoints.Budgets.Shared;

public sealed record BudgetResponse(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    string LimitAmount,
    string Spent,
    string Remaining,
    string Period);
