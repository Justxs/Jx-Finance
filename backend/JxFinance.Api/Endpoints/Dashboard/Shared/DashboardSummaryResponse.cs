namespace JxFinance.Endpoints.Dashboard.Shared;

public sealed record DashboardSummaryResponse(
    string TotalBalance,
    string MonthIncome,
    string MonthExpense,
    DateOnly MonthStart,
    DateOnly MonthEnd);
