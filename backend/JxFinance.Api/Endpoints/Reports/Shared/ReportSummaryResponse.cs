using JxFinance.Common.Json;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Reports.Shared;

public sealed record ReportTrendPoint(
    DateOnly BucketStart,
    [property: Money] decimal Income,
    [property: Money] decimal Expense,
    DateOnly? ComparisonBucketStart = null,
    [property: Money] decimal? ComparisonIncome = null,
    [property: Money] decimal? ComparisonExpense = null);

public sealed record ReportComparisonTotals(
    ReportComparisonMode Mode,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    [property: Money] decimal TotalIncome,
    [property: Money] decimal TotalExpense,
    [property: Money] decimal Net);

public sealed record ReportSummaryResponse(
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    [property: Money] decimal TotalIncome,
    [property: Money] decimal TotalExpense,
    [property: Money] decimal Net,
    IReadOnlyList<CategoryBreakdownItem> ExpenseByCategory,
    IReadOnlyList<CategoryBreakdownItem> IncomeByCategory,
    IReadOnlyList<ReportTrendPoint> Trend,
    string TrendBucket,
    IReadOnlyList<TagBreakdownItem> ExpenseByTag,
    ReportComparisonTotals? Comparison = null);
