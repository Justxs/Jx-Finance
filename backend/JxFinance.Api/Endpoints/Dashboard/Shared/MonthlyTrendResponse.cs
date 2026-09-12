namespace JxFinance.Endpoints.Dashboard.Shared;

public sealed record MonthlyTrendItem(int Year, int Month, string Income, string Expense);

public sealed record MonthlyTrendResponse(IReadOnlyList<MonthlyTrendItem> Items);
