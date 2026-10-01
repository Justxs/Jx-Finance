using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Budgets.Shared;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.Reports.Shared;

namespace JxFinance.Endpoints.MonthCloses.Shared;

public enum MonthCloseStatus
{
    NotEnded,
    Open,
    Closed,
    ClosedChanged,
}

public enum MonthDriftChange
{
    Created,
    Edited,
    Deleted,
    MovedOut,
}

public enum MonthDriftRowKind
{
    Transaction,
    InvestmentEntry,
}

public sealed record MonthCloseYearResponse(int Year, IReadOnlyList<MonthCloseMonthStatus> Months);

public sealed record MonthCloseMonthStatus(DateOnly Month, MonthCloseStatus Status, DateTimeOffset? ClosedAt);

public sealed record MonthReviewResponse(
    DateOnly Month,
    DateOnly MonthEnd,
    MonthCloseStatus Status,
    DateTimeOffset? ClosedAt,
    string? Note,
    MonthChecklist Checklist,
    ReportSummaryResponse Figures,
    IReadOnlyList<BudgetResponse>? Budgets,
    NetWorthSnapshotItem? NetWorthStart,
    NetWorthSnapshotItem? NetWorthEnd,
    MonthDrift? Drift);

public sealed record MonthChecklist(
    int Uncategorized,
    int? UnconfirmedRecurring,
    int? Unusual,
    int Duplicates,
    IReadOnlyList<MonthAccountCoverage> Accounts);

public enum MonthAccountState
{
    Reconciled,
    Differs,
    Imported,
    Behind,
}

public sealed record MonthAccountCoverage(
    Guid AccountId,
    string AccountName,
    MonthAccountState State,
    DateOnly? Date,
    [property: Money] decimal? Difference,
    Currency Currency,
    IReadOnlyList<MonthCurrencyCoverage> OtherCurrencies)
{
    public static MonthAccountState StateOf(DateOnly monthEnd, decimal? difference, DateOnly? latestImport) =>
        difference switch
        {
            0m => MonthAccountState.Reconciled,
            not null => MonthAccountState.Differs,
            _ => latestImport >= monthEnd ? MonthAccountState.Imported : MonthAccountState.Behind,
        };
}

public sealed record MonthCurrencyCoverage(
    Currency Currency,
    MonthAccountState State,
    DateOnly Date,
    [property: Money] decimal? Difference);

public sealed record MonthDrift(
    bool CurrencyChanged,
    Currency ClosedCurrency,
    MonthDriftTotals? Totals,
    IReadOnlyList<MonthDriftCategory> Categories,
    IReadOnlyList<MonthDriftRow> Rows,
    int RowCount);

public sealed record MonthDriftTotals(
    [property: Money] decimal ClosedIncome,
    [property: Money] decimal ClosedExpense,
    [property: Money] decimal ClosedNet,
    int ClosedCount,
    int CurrentCount);

public sealed record MonthDriftCategory(
    FlowType Type,
    Guid? CategoryId,
    SyntheticCategoryGroup? SyntheticGroup,
    string CategoryName,
    [property: Money] decimal ClosedAmount,
    [property: Money] decimal CurrentAmount);

public sealed record MonthDriftRow(
    Guid Id,
    MonthDriftRowKind Kind,
    MonthDriftChange Change,
    DateOnly Date,
    string? Description,
    [property: Money] decimal Amount,
    Currency Currency,
    DateTimeOffset ChangedAt);
