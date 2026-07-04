namespace JxFinance.Endpoints.Dashboard;

public sealed record DashboardSummaryResponse(
    string TotalBalance,
    string MonthIncome,
    string MonthExpense,
    DateOnly MonthStart,
    DateOnly MonthEnd);
