using JxFinance.Domain.Common;

namespace JxFinance.Common.RecurringBills;

public static class RecurringEstimate
{
    public const int SampleSize = 6;
    public const int LookBackMonths = 13;

    public static decimal? Of(IEnumerable<(DateOnly Date, decimal Amount)> rows)
    {
        var newest = rows
            .OrderByDescending(row => row.Date)
            .Take(SampleSize)
            .Select(row => row.Amount)
            .ToList();
        return newest.Count > 0 ? Money.Round(Statistics.Median(newest)) : null;
    }
}
