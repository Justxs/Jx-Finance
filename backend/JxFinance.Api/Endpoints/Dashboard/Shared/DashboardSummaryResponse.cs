using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Dashboard.Shared;

public sealed record DashboardSummaryResponse(
    [property: Money] decimal TotalBalance,
    [property: Money] decimal MonthIncome,
    [property: Money] decimal MonthExpense,
    DateOnly MonthStart,
    DateOnly MonthEnd);
