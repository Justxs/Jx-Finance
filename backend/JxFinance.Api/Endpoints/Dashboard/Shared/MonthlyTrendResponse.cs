using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Dashboard.Shared;

public sealed record MonthlyTrendItem(int Year, int Month, [property: Money] decimal Income, [property: Money] decimal Expense);

public sealed record MonthlyTrendResponse(IReadOnlyList<MonthlyTrendItem> Items);
