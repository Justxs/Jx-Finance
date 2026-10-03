using System.Globalization;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.MonthCloses.Shared;

public static class MonthlyDigest
{
    public const int MaxMovers = 3;

    public static MonthlyDigestPayload? From(MonthReviewResponse review, Currency currency)
    {
        var figures = review.Figures;
        var checklist = review.Checklist;
        var accounts = checklist.Accounts.Count(a => a.State is MonthAccountState.Differs or MonthAccountState.Behind);
        var hasOpenItems = checklist.Uncategorized > 0
            || checklist.Unusual > 0
            || checklist.UnconfirmedRecurring > 0
            || accounts > 0;
        if (figures.TotalIncome == 0m && figures.TotalExpense == 0m && !hasOpenItems)
        {
            return null;
        }

        var movers = figures.ExpenseByCategory
            .Select(item => (item.CategoryName, item.Amount, Previous: item.ComparisonAmount ?? 0m))
            .Where(item => item.Amount != item.Previous)
            .OrderByDescending(item => Math.Abs(item.Amount - item.Previous))
            .Take(MaxMovers)
            .Select(item => new MonthlyDigestMover(item.CategoryName, Text(item.Amount), Text(item.Previous)))
            .ToList();

        return new MonthlyDigestPayload(
            currency,
            Text(figures.TotalIncome),
            Text(figures.TotalExpense),
            Text(figures.Net),
            figures.TotalIncome > 0m
                ? (int)Math.Round(Math.Max(0m, figures.Net) * 100m / figures.TotalIncome, MidpointRounding.AwayFromZero)
                : null,
            movers,
            checklist.Uncategorized,
            checklist.Unusual,
            checklist.UnconfirmedRecurring,
            accounts,
            review.Status is MonthCloseStatus.Closed or MonthCloseStatus.ClosedChanged);
    }

    private static string Text(decimal value) => value.ToString("0.00", CultureInfo.InvariantCulture);
}
