using JxFinance.Endpoints.Dashboard;

namespace JxFinance.Endpoints.Reports;

public sealed record ReportTrendPoint(DateOnly BucketStart, string Income, string Expense);

public sealed record ReportSummaryResponse(
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    string TotalIncome,
    string TotalExpense,
    string Net,
    IReadOnlyList<CategoryBreakdownItem> ExpenseByCategory,
    IReadOnlyList<ReportTrendPoint> Trend,
    string TrendBucket);
