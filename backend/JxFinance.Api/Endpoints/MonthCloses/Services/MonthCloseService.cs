using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.InvestmentCashFlows;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.MonthCloses;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Endpoints.MonthCloses.Interfaces;
using JxFinance.Endpoints.MonthCloses.Shared;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.Reports.Interfaces;
using JxFinance.Endpoints.Reports.Shared;
using JxFinance.Endpoints.Transactions.GetTransactionsSummary;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.MonthCloses.Services;

[RegisterService<IMonthCloseService>(LifeTime.Scoped)]
public sealed class MonthCloseService(
    AppDbContext db,
    ICurrentUser currentUser,
    IClock clock,
    IInstanceSettingsStore settings,
    IReportService reports,
    ITransactionService transactions,
    IBudgetService budgetService,
    INetWorthService netWorth,
    IInvestmentCashFlowService investmentCashFlows,
    IReconciliationService reconciliations) : IMonthCloseService
{
    public const int MaxDriftRows = 100;

    private static readonly DomainError NotClosed = EntityLookup.NotFound("This month is not closed.");

    private static readonly DomainError NotEnded = new(
        ErrorCodes.MonthCloseNotEnded,
        "Only a month that has ended can be closed.");

    private sealed class ChangedRow
    {
        public Guid Id { get; set; }
        public MonthDriftRowKind Kind { get; set; }
        public DateOnly Date { get; set; }
        public string? Description { get; set; }
        public decimal Amount { get; set; }
        public Currency Currency { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
    }

    private sealed record FigureKey(FlowType Type, Guid? CategoryId, string? SyntheticGroup);

    public async Task<Result<MonthCloseYearResponse>> GetYearAsync(int? year, CancellationToken cancellationToken)
    {
        var chosen = year ?? clock.Today.Year;
        if (!MonthKey.IsSupportedYear(chosen))
        {
            return MonthKey.Invalid;
        }

        var start = new DateOnly(chosen, 1, 1);
        var end = start.AddYears(1);
        var closes = await Scoped()
            .AsNoTracking()
            .Where(c => c.Month >= start && c.Month < end)
            .ToListAsync(cancellationToken);
        var changes = closes.Count == 0
            ? []
            : await Changes(closes.Min(c => c.ClosedAt), start, end, closes.SelectMany(c => c.Snapshot.RowIds).ToList())
                .Select(r => new { r.Id, r.Date, r.UpdatedAt })
                .ToListAsync(cancellationToken);
        var reporting = settings.Current.ReportingCurrency;
        var flows = await db.Transactions
            .Where(t => t.Date >= start && t.Date < end)
            .GroupBy(t => new { t.Date, t.Type })
            .Select(g => new InvestmentCashFlow(g.Key.Date, g.Key.Type, g.Sum(t => t.ReportingAmount)))
            .ToListAsync(cancellationToken);
        var totals = flows
            .Concat(await investmentCashFlows.GetFlowsAsync(new DateWindow(start, end), null, cancellationToken))
            .ToLookup(f => (DateWindow.MonthOf(f.Date).Start, f.Type), f => f.Amount);

        var months = Enumerable.Range(0, 12).Select(offset =>
        {
            var month = start.AddMonths(offset);
            var close = closes.FirstOrDefault(c => c.Month == month);
            var window = DateWindow.MonthOf(month);
            var changed = close is not null
                && (close.Snapshot.ReportingCurrency != reporting
                    || close.Snapshot.TotalIncome != totals[(month, FlowType.Income)].Sum()
                    || close.Snapshot.TotalExpense != totals[(month, FlowType.Expense)].Sum()
                    || changes.Any(r => r.UpdatedAt > close.ClosedAt
                        && (window.Contains(r.Date) || close.Snapshot.RowIds.Contains(r.Id))));
            return new MonthCloseMonthStatus(month, Status(month, close, changed), close?.ClosedAt);
        }).ToList();

        return new MonthCloseYearResponse(chosen, months);
    }

    public Task<Result<MonthReviewResponse>> GetMonthAsync(string month, CancellationToken cancellationToken) =>
        ForMonthAsync(month, async start => await ReviewAsync(start, cancellationToken));

    public Task<Result<MonthReviewResponse>> CloseAsync(string month, string? note, CancellationToken cancellationToken) =>
        ForMonthAsync(month, async start =>
        {
            if (!HasEnded(start))
            {
                return NotEnded;
            }

            await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
            await db.Database.LockAsync(currentUser.Id, cancellationToken);
            var closedAt = clock.UtcNow;
            var snapshot = await SnapshotAsync(start, cancellationToken);
            var close = await Scoped().FirstOrDefaultAsync(c => c.Month == start, cancellationToken);
            if (close is null)
            {
                close = new MonthClose
                {
                    Month = start,
                    HouseholdId = currentUser.ActiveHouseholdId,
                    Snapshot = snapshot,
                };
                db.MonthCloses.Add(close);
            }
            else
            {
                close.Snapshot = snapshot;
            }

            close.ClosedAt = closedAt;
            if (note is not null)
            {
                close.Note = OptionalText.Normalize(note);
            }

            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return await ReviewAsync(start, cancellationToken);
        });

    public Task<Result<MonthReviewResponse>> UpdateNoteAsync(string month, string? note, CancellationToken cancellationToken) =>
        ForMonthAsync(month, async start =>
        {
            if (await Scoped().FirstOrDefaultAsync(c => c.Month == start, cancellationToken) is not { } close)
            {
                return NotClosed;
            }

            close.Note = OptionalText.Normalize(note);
            await db.SaveChangesAsync(cancellationToken);
            return await ReviewAsync(start, cancellationToken);
        });

    public async Task<Result> ReopenAsync(string month, CancellationToken cancellationToken)
    {
        var parsed = MonthKey.Parse(month);
        if (!parsed.TryGetValue(out var start))
        {
            return parsed.Error;
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(currentUser.Id, cancellationToken);
        await Scoped().Where(c => c.Month == start).ExecuteDeleteAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Result.Success();
    }

    private static async Task<Result<MonthReviewResponse>> ForMonthAsync(
        string month,
        Func<DateOnly, Task<Result<MonthReviewResponse>>> action)
    {
        var parsed = MonthKey.Parse(month);
        return parsed.TryGetValue(out var start) ? await action(start) : parsed.Error;
    }

    private IQueryable<MonthClose> Scoped()
    {
        var householdId = currentUser.ActiveHouseholdId;
        return db.MonthCloses.Where(c => c.HouseholdId == householdId);
    }

    private bool HasEnded(DateOnly month) => DateWindow.MonthOf(month).InclusiveEnd < clock.Today;

    private bool IsEnabled(Feature feature) => settings.Current.IsEnabled(feature);

    private MonthCloseStatus Status(DateOnly month, MonthClose? close, bool changed) =>
        close is null
            ? HasEnded(month) ? MonthCloseStatus.Open : MonthCloseStatus.NotEnded
            : changed ? MonthCloseStatus.ClosedChanged : MonthCloseStatus.Closed;

    private async Task<MonthReviewResponse> ReviewAsync(DateOnly start, CancellationToken cancellationToken)
    {
        var window = DateWindow.MonthOf(start);
        var figures = await reports.GetSummaryAsync(
            window.Start,
            window.InclusiveEnd,
            ReportComparisonMode.PreviousMonth,
            cancellationToken);
        var checklist = await ChecklistAsync(window, cancellationToken);
        var budgets = IsEnabled(Feature.Budgets)
            ? await budgetService.GetMonthlyAsync(window.InclusiveEnd, cancellationToken)
            : null;
        var history = IsEnabled(Feature.NetWorth) ? (await netWorth.GetHistoryAsync(cancellationToken)).Items : [];

        var close = await Scoped().AsNoTracking().FirstOrDefaultAsync(c => c.Month == start, cancellationToken);
        var drift = close is null ? null : await DriftAsync(close, window, figures, cancellationToken);
        var changed = drift is not null
            && (drift.CurrencyChanged
                || drift.RowCount > 0
                || drift.Categories.Count > 0
                || drift.Totals is { } totals && (totals.ClosedIncome != figures.TotalIncome
                    || totals.ClosedExpense != figures.TotalExpense
                    || totals.ClosedCount != totals.CurrentCount));

        return new MonthReviewResponse(
            start,
            window.InclusiveEnd,
            Status(start, close, changed),
            close?.ClosedAt,
            close?.Note,
            checklist,
            figures,
            budgets,
            history.LastOrDefault(i => i.Date < window.Start),
            history.LastOrDefault(i => i.Date <= window.InclusiveEnd),
            drift);
    }

    private async Task<MonthChecklist> ChecklistAsync(DateWindow window, CancellationToken cancellationToken)
    {
        var uncategorized = await transactions.GetSummaryAsync(
            new GetTransactionsSummaryRequest { DateFrom = window.Start, DateTo = window.InclusiveEnd, Uncategorized = true },
            cancellationToken);

        int? unusual = null;
        if (IsEnabled(Feature.UnusualAmounts))
        {
            unusual = (await transactions.GetSummaryAsync(
                new GetTransactionsSummaryRequest { DateFrom = window.Start, DateTo = window.InclusiveEnd, Unusual = true },
                cancellationToken)).Count;
        }

        int? recurring = null;
        if (IsEnabled(Feature.RecurringBills))
        {
            var lastDay = window.InclusiveEnd;
            recurring = await db.RecurringBills.CountAsync(b => b.IsActive && b.NextDueDate <= lastDay, cancellationToken);
        }

        return new MonthChecklist(uncategorized.Count, recurring, unusual, await AccountCoverageAsync(window.InclusiveEnd, cancellationToken));
    }

    private async Task<IReadOnlyList<MonthAccountCoverage>> AccountCoverageAsync(DateOnly monthEnd, CancellationToken cancellationToken)
    {
        var reconciled = (await reconciliations.CoverageAsync(monthEnd, cancellationToken)).ToDictionary(c => c.AccountId);
        var imports = IsEnabled(Feature.Import)
            ? await db.Transactions
                .Where(t => t.Source == TransactionSource.Imported)
                .GroupBy(t => t.AccountId)
                .Select(g => new { AccountId = g.Key, Latest = g.Max(t => t.Date) })
                .Join(db.Accounts, l => l.AccountId, a => a.Id, (l, a) => new { a.Id, a.Name, a.StartingBalance.Currency, l.Latest })
                .ToListAsync(cancellationToken)
            : [];
        var imported = imports.ToDictionary(i => i.Id.Value, i => i.Latest);

        return reconciled.Values
            .Select(r => (r.AccountId, r.AccountName, r.Currency))
            .Concat(imports.Select(i => (AccountId: i.Id.Value, AccountName: i.Name, i.Currency)))
            .DistinctBy(a => a.AccountId)
            .OrderBy(a => a.AccountName, StringComparer.CurrentCultureIgnoreCase)
            .Select(a =>
            {
                var check = reconciled.GetValueOrDefault(a.AccountId);
                var latestImport = imported.TryGetValue(a.AccountId, out var latest) ? latest : (DateOnly?)null;
                var state = MonthAccountCoverage.StateOf(monthEnd, check?.Difference, latestImport);
                var date = state switch
                {
                    MonthAccountState.Reconciled or MonthAccountState.Differs => check?.Date,
                    MonthAccountState.Imported => latestImport,
                    _ => new[] { latestImport, check?.Date }.Max(),
                };
                return new MonthAccountCoverage(a.AccountId, a.AccountName, state, date, check?.Difference, a.Currency);
            })
            .ToList();
    }

    private async Task<MonthCloseSnapshot> SnapshotAsync(DateOnly start, CancellationToken cancellationToken)
    {
        var window = DateWindow.MonthOf(start);
        var summary = await reports.GetSummaryAsync(window.Start, window.InclusiveEnd, ReportComparisonMode.None, cancellationToken);
        var transactionIds = await db.Transactions
            .Where(t => t.Date >= window.Start && t.Date < window.ExclusiveEnd)
            .Select(t => t.Id.Value)
            .ToListAsync(cancellationToken);
        var entryIds = await db.InvestmentTransactions
            .Where(t => t.Date >= window.Start && t.Date < window.ExclusiveEnd)
            .Select(t => t.Id.Value)
            .ToListAsync(cancellationToken);

        return new MonthCloseSnapshot(
            settings.Current.ReportingCurrency,
            summary.TotalIncome,
            summary.TotalExpense,
            summary.Net,
            transactionIds.Count,
            summary.IncomeByCategory.Select(Figure).ToList(),
            summary.ExpenseByCategory.Select(Figure).ToList(),
            [.. transactionIds, .. entryIds]);
    }

    private static MonthCloseFigure Figure(CategoryBreakdownItem item) =>
        new(item.CategoryId, item.SyntheticGroup?.ToString(), item.CategoryName, item.Amount);

    private async Task<MonthDrift> DriftAsync(
        MonthClose close,
        DateWindow window,
        ReportSummaryResponse current,
        CancellationToken cancellationToken)
    {
        var snapshot = close.Snapshot;
        if (snapshot.ReportingCurrency != settings.Current.ReportingCurrency)
        {
            return new MonthDrift(true, snapshot.ReportingCurrency, null, [], [], 0);
        }

        var currentCount = await db.Transactions.CountAsync(
            t => t.Date >= window.Start && t.Date < window.ExclusiveEnd,
            cancellationToken);
        var totals = new MonthDriftTotals(
            snapshot.TotalIncome,
            snapshot.TotalExpense,
            snapshot.Net,
            snapshot.TransactionCount,
            currentCount);

        var changes = Changes(close.ClosedAt, window.Start, window.ExclusiveEnd, snapshot.RowIds);
        var rowCount = await changes.CountAsync(cancellationToken);
        var rows = rowCount == 0
            ? []
            : await changes.OrderByDescending(r => r.UpdatedAt).Take(MaxDriftRows).ToListAsync(cancellationToken);
        var known = snapshot.RowIds.ToHashSet();

        return new MonthDrift(
            false,
            snapshot.ReportingCurrency,
            totals,
            CategoryDrift(snapshot, current),
            rows.Select(row => new MonthDriftRow(
                row.Id,
                row.Kind,
                row.IsDeleted ? MonthDriftChange.Deleted
                    : !known.Contains(row.Id) ? MonthDriftChange.Created
                    : !window.Contains(row.Date) ? MonthDriftChange.MovedOut
                    : MonthDriftChange.Edited,
                row.Date,
                row.Description,
                row.Amount,
                row.Currency,
                row.UpdatedAt)).ToList(),
            rowCount);
    }

    private IQueryable<ChangedRow> Changes(DateTimeOffset since, DateOnly from, DateOnly to, IReadOnlyList<Guid> knownIds)
    {
        var knownTransactions = knownIds.Select(id => new TransactionId(id)).ToList();
        var knownEntries = knownIds.Select(id => new InvestmentTransactionId(id)).ToList();
        return db.Transactions
            .IgnoreQueryFilters(QueryFilters.SoftDeleteOnly)
            .Where(t => t.UpdatedAt > since && ((t.Date >= from && t.Date < to) || knownTransactions.Contains(t.Id)))
            .Select(t => new ChangedRow
            {
                Id = (Guid)(object)t.Id,
                Kind = MonthDriftRowKind.Transaction,
                Date = t.Date,
                Description = t.Description,
                Amount = t.Amount.Amount,
                Currency = t.Amount.Currency,
                UpdatedAt = t.UpdatedAt,
                IsDeleted = t.IsDeleted,
            })
            .Concat(db.InvestmentTransactions
                .IgnoreQueryFilters(QueryFilters.SoftDeleteOnly)
                .Where(t => t.UpdatedAt > since && ((t.Date >= from && t.Date < to) || knownEntries.Contains(t.Id)))
                .Select(t => new ChangedRow
                {
                    Id = (Guid)(object)t.Id,
                    Kind = MonthDriftRowKind.InvestmentEntry,
                    Date = t.Date,
                    Description = t.Description,
                    Amount = t.CashAmount.Amount,
                    Currency = t.CashAmount.Currency,
                    UpdatedAt = t.UpdatedAt,
                    IsDeleted = t.IsDeleted,
                }));
    }

    private static List<MonthDriftCategory> CategoryDrift(MonthCloseSnapshot snapshot, ReportSummaryResponse current)
    {
        var closed = ByKey(snapshot.Income, snapshot.Expense);
        var latest = ByKey(current.IncomeByCategory.Select(Figure), current.ExpenseByCategory.Select(Figure));

        return closed.Keys.Union(latest.Keys)
            .Select(key =>
            {
                var before = closed.GetValueOrDefault(key);
                var after = latest.GetValueOrDefault(key);
                return new MonthDriftCategory(
                    key.Type,
                    key.CategoryId,
                    Enum.TryParse<SyntheticCategoryGroup>(key.SyntheticGroup, out var group) ? group : null,
                    (after ?? before)!.Name,
                    Money.Round(before?.Amount ?? 0m),
                    Money.Round(after?.Amount ?? 0m));
            })
            .Where(entry => entry.ClosedAmount != entry.CurrentAmount)
            .OrderByDescending(entry => Math.Abs(entry.CurrentAmount - entry.ClosedAmount))
            .ToList();
    }

    private static Dictionary<FigureKey, MonthCloseFigure> ByKey(
        IEnumerable<MonthCloseFigure> income,
        IEnumerable<MonthCloseFigure> expense) =>
        income.Select(figure => (Type: FlowType.Income, Figure: figure))
            .Concat(expense.Select(figure => (Type: FlowType.Expense, Figure: figure)))
            .GroupBy(pair => new FigureKey(pair.Type, pair.Figure.CategoryId, pair.Figure.SyntheticGroup))
            .ToDictionary(group => group.Key, group => group.First().Figure with { Amount = group.Sum(pair => pair.Figure.Amount) });
}
