using JxFinance.Common;
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
    public const int MaxOccurrences = 64;
    public const int EstimateSampleSize = 6;
    public const int EstimateLookBackMonths = 13;
    public const int PaidToleranceDays = 5;
    public const int WeeklyPaidToleranceDays = 2;
    public const int UsualSpendingMonths = 3;

    public static IReadOnlyList<ForecastOccurrence> Occurrences(
        RecurringBill bill,
        DateOnly today,
        DateOnly end,
        IEnumerable<DateOnly> matchedDates)
    {
        var tolerance = bill.Cadence == RecurringBillCadence.Weekly ? WeeklyPaidToleranceDays : PaidToleranceDays;
        var paidFrom = bill.NextDueDate.AddDays(-tolerance);
        var date = matchedDates.Any(matched => matched >= paidFrom && matched <= today)
            ? RecurringBill.Advance(bill.NextDueDate, bill.Cadence, bill.AnchorDay)
            : bill.NextDueDate;

        var occurrences = new List<ForecastOccurrence>();
        while (date <= end && occurrences.Count < MaxOccurrences)
        {
            occurrences.Add(date < today ? new ForecastOccurrence(today, true) : new ForecastOccurrence(date, false));
            date = RecurringBill.Advance(date, bill.Cadence, bill.AnchorDay);
        }

        return occurrences;
    }

    public static decimal? Estimate(IEnumerable<(DateOnly Date, decimal Amount)> matches)
    {
        var newest = matches
            .OrderByDescending(match => match.Date)
            .Take(EstimateSampleSize)
            .Select(match => match.Amount)
            .ToList();
        return newest.Count > 0 ? Money.Round(Statistics.Median(newest)) : null;
    }

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
