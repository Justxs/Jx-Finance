using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.InvestmentCashFlows;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Endpoints.Reports.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Dashboard.Services;

[RegisterService<IDashboardService>(LifeTime.Scoped)]
public sealed class DashboardService(
    AppDbContext db,
    IClock clock,
    ICategoryAttributionService attributions,
    IAccountService accountService,
    IInvestmentCashFlowService investmentCashFlows)
    : IDashboardService
{
    public async Task<DashboardSummaryResponse> GetSummaryAsync(string? month, CancellationToken cancellationToken)
    {
        var period = ResolveMonth(month, clock.Today);
        var (monthStart, monthEnd) = period;

        var balanceDate = period.InclusiveEnd < clock.Today ? period.InclusiveEnd : (DateOnly?)null;
        var (totalBalance, isComplete) = await accountService.GetReportingTotalAsync(balanceDate, cancellationToken);

        var (monthIncome, monthExpense) = (await db.Transactions.DailyFlowsAsync(period, null, cancellationToken))
            .Concat(await investmentCashFlows.GetFlowsAsync(period, null, cancellationToken))
            .Totals();

        return new DashboardSummaryResponse(
            totalBalance,
            monthIncome,
            monthExpense,
            monthStart,
            period.InclusiveEnd,
            isComplete);
    }

    public async Task<CategoryBreakdownResponse> GetCategoryBreakdownAsync(
        string? month,
        CancellationToken cancellationToken)
    {
        var period = ResolveMonth(month, clock.Today);
        var shown = period.Contains(clock.Today) ? DateWindow.Inclusive(period.Start, clock.Today) : period;
        var earlier = ComparisonWindow.For(ReportComparisonMode.PreviousMonth, shown)!.Value;

        var categoryAttributions = await attributions.GetAttributionsAsync(
            period,
            null,
            FlowType.Expense,
            cancellationToken);
        var earlierAttributions = await attributions.GetAttributionsAsync(
            earlier,
            null,
            FlowType.Expense,
            cancellationToken);

        var categories = await db.Categories.ToDictionaryAsync(c => c.Id, cancellationToken);

        var investmentFlows = await investmentCashFlows.GetFlowsAsync(period, null, cancellationToken);
        var earlierFlows = await investmentCashFlows.GetFlowsAsync(earlier, null, cancellationToken);
        var items = CategoryBreakdownBuilder.Build(
            categoryAttributions,
            categories,
            investmentFlows,
            FlowType.Expense,
            earlierAttributions,
            earlierFlows);

        return new CategoryBreakdownResponse(
            items,
            period.Start,
            period.InclusiveEnd,
            earlier.Start,
            earlier.InclusiveEnd);
    }

    public async Task<MonthlyTrendResponse> GetMonthlyTrendAsync(
        int months,
        string? month,
        CancellationToken cancellationToken)
    {
        var clamped = Math.Clamp(months, 1, 24);
        var lastMonth = ResolveMonth(month, clock.Today);
        var earliestStart = lastMonth.Start.AddMonths(-(clamped - 1));

        var window = new DateWindow(earliestStart, lastMonth.ExclusiveEnd);
        var byMonth = (await db.Transactions.DailyFlowsAsync(window, null, cancellationToken))
            .Concat(await investmentCashFlows.GetFlowsAsync(window, null, cancellationToken))
            .ToLookup(f => DateWindow.MonthOf(f.Date).Start);

        return new MonthlyTrendResponse(Enumerable.Range(0, clamped)
            .Select(i =>
            {
                var monthStart = earliestStart.AddMonths(i);
                var (income, expense) = byMonth[monthStart].Totals();
                return new MonthlyTrendItem(monthStart.Year, monthStart.Month, income, expense);
            })
            .ToList());
    }

    private static DateWindow ResolveMonth(string? month, DateOnly fallbackToday) =>
        DateWindow.MonthOf(month is null ? fallbackToday : MonthKey.Parse(month).Value);
}
