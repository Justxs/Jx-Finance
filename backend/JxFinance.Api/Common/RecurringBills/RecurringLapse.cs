namespace JxFinance.Common.RecurringBills;

public static class RecurringLapse
{
    public const int MissedCycles = 2;
    public const int LookBackMonths = 25;

    public static bool PossiblyCancelled(
        IEnumerable<ScheduledOccurrence> occurrences,
        IReadOnlyDictionary<ScheduledOccurrence, RecurringRow> paid,
        DateOnly today)
    {
        var closed = occurrences
            .Where(occurrence => occurrence.Date.AddDays(RecurringMatch.ToleranceDays(occurrence.Bill.Cadence)) < today)
            .OrderByDescending(occurrence => occurrence.Date)
            .Take(MissedCycles)
            .ToList();
        return closed.Count == MissedCycles && !closed.Any(paid.ContainsKey);
    }
}
