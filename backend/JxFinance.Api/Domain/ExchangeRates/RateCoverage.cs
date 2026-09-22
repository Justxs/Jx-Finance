namespace JxFinance.Domain.ExchangeRates;

public readonly record struct DateRange(DateOnly From, DateOnly To);

public static class RateCoverage
{
    public static List<DateRange> Uncovered(
        IEnumerable<DateOnly> known,
        DateOnly start,
        DateOnly end,
        int maxGapDays)
    {
        var gaps = new List<DateRange>();
        DateOnly? previous = null;
        var next = start;
        foreach (var date in known)
        {
            var before = date.AddDays(-1);
            if (before >= next && IsUncovered(previous, before, maxGapDays))
            {
                gaps.Add(new DateRange(next, before));
            }

            previous = date;
            if (date >= next)
            {
                next = date.AddDays(1);
            }
        }

        if (next <= end && IsUncovered(previous, end, maxGapDays))
        {
            gaps.Add(new DateRange(next, end));
        }

        return gaps;
    }

    private static bool IsUncovered(DateOnly? previous, DateOnly last, int maxGapDays) =>
        previous is not { } covered || last.DayNumber - covered.DayNumber > maxGapDays;
}
