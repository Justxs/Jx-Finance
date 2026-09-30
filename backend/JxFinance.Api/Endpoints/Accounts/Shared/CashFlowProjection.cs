using JxFinance.Common;
using JxFinance.Common.RecurringBills;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.Accounts.GetCashFlowForecast;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record ForecastOccurrence(DateOnly Date, bool Overdue);

public sealed record ForecastProjection(
    IReadOnlyList<ForecastEntryResponse> Entries,
    decimal LowestBalance,
    DateOnly LowestOn,
    DateOnly? BelowZeroOn,
    DateOnly? BelowZeroWithSpendingOn);

public static class CashFlowProjection
{
    public const int MaxOccurrences = RecurringOccurrences.MaxOccurrences;
    public const int UsualSpendingMonths = 3;

    public static IReadOnlyList<ForecastOccurrence> Occurrences(
        RecurringBill bill,
        DateOnly today,
        DateOnly end,
        IEnumerable<DateOnly> matchedDates)
    {
        var paidFrom = bill.NextDueDate.AddDays(-RecurringMatch.ToleranceDays(bill.Cadence));
        var start = matchedDates.Any(matched => matched >= paidFrom && matched <= today)
            ? RecurringBill.Advance(bill.NextDueDate, bill.Cadence, bill.AnchorDay)
            : bill.NextDueDate;

        return RecurringOccurrences.After(bill, start, end)
            .Select(date => date < today ? new ForecastOccurrence(today, true) : new ForecastOccurrence(date, false))
            .ToList();
    }

    public static decimal? Estimate(IEnumerable<(DateOnly Date, decimal Amount)> matches) =>
        RecurringEstimate.Of(matches);

    public static decimal? UsualDailySpending(IReadOnlyList<(DateOnly Month, decimal Total)> monthTotals) =>
        monthTotals.Count < UsualSpendingMonths
            ? null
            : Money.Round(Statistics.Median(monthTotals
                .Select(month => month.Total / DateTime.DaysInMonth(month.Month.Year, month.Month.Month))
                .ToList()));

    public static ForecastProjection Project(
        decimal startBalance,
        IEnumerable<ForecastEntryResponse> changes,
        decimal? dailySpending,
        DateOnly today,
        DateOnly end)
    {
        var ordered = changes.OrderBy(change => change.Date).ThenByDescending(change => change.Amount).ToList();
        var entries = new List<ForecastEntryResponse>(ordered.Count);
        var balance = startBalance;
        var lowest = startBalance;
        var lowestOn = today;
        DateOnly? belowZeroOn = null;
        DateOnly? belowZeroWithSpendingOn = null;
        var next = 0;

        for (var date = today; date <= end; date = date.AddDays(1))
        {
            for (; next < ordered.Count && ordered[next].Date <= date; next++)
            {
                balance += ordered[next].Amount;
                entries.Add(ordered[next] with { BalanceAfter = balance });
            }

            if (balance < lowest)
            {
                lowest = balance;
                lowestOn = date;
            }

            if (balance < 0m)
            {
                belowZeroOn ??= date;
            }

            if (dailySpending is { } rate && balance - (rate * (date.DayNumber - today.DayNumber)) < 0m)
            {
                belowZeroWithSpendingOn ??= date;
            }
        }

        return new ForecastProjection(entries, lowest, lowestOn, belowZeroOn, belowZeroWithSpendingOn);
    }
}
