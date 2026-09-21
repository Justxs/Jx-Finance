using JxFinance.Domain.RecurringBills;

namespace JxFinance.Common.Subscriptions;

public static class SubscriptionDetection
{
    public const int LookBackMonths = 24;
    public const int MinimumOccurrences = 3;
    public const int MaxScannedTransactions = 4000;
    public const int MaxCandidates = 20;
    public const decimal AmountTolerance = 0.15m;

    private static readonly (RecurringBillCadence Cadence, int Days, int ToleranceDays)[] Cadences =
    [
        (RecurringBillCadence.Weekly, 7, 2),
        (RecurringBillCadence.Monthly, 30, 5),
        (RecurringBillCadence.Quarterly, 91, 12),
        (RecurringBillCadence.Yearly, 365, 30),
    ];

    public static RecurringBillCadence? CadenceOf(IReadOnlyList<DateOnly> dates)
    {
        if (dates.Count < MinimumOccurrences)
        {
            return null;
        }

        foreach (var (cadence, days, tolerance) in Cadences)
        {
            if (EveryGapFits(dates, days, tolerance))
            {
                return cadence;
            }
        }

        return null;
    }

    public static decimal? TypicalAmount(IReadOnlyList<decimal> amounts)
    {
        if (amounts.Count == 0)
        {
            return null;
        }

        var sorted = amounts.Order().ToList();
        var middle = sorted.Count / 2;
        var median = sorted.Count % 2 == 1
            ? sorted[middle]
            : decimal.Round((sorted[middle - 1] + sorted[middle]) / 2, 2, MidpointRounding.AwayFromZero);

        if (median <= 0)
        {
            return null;
        }

        var allowed = median * AmountTolerance;
        return sorted.All(amount => Math.Abs(amount - median) <= allowed) ? median : null;
    }

    private static bool EveryGapFits(IReadOnlyList<DateOnly> dates, int days, int tolerance)
    {
        for (var index = 1; index < dates.Count; index++)
        {
            var gap = dates[index].DayNumber - dates[index - 1].DayNumber;
            if (Math.Abs(gap - days) > tolerance)
            {
                return false;
            }
        }

        return true;
    }
}
