using JxFinance.Common.Unusual;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Common.RecurringBills;

public sealed record ScheduledOccurrence(RecurringBill Bill, DateOnly Date);

public static class RecurringMatch
{
    public const int PaidToleranceDays = 5;
    public const int WeeklyPaidToleranceDays = 2;

    public static int ToleranceDays(RecurringBillCadence cadence) =>
        cadence == RecurringBillCadence.Weekly ? WeeklyPaidToleranceDays : PaidToleranceDays;

    public static bool Pays(RecurringBill bill, IReadOnlyList<string> keys, RecurringRow row) =>
        row.Shape == bill.Shape
        && (bill.AccountId is null || row.AccountId == bill.AccountId)
        && (bill.Shape != RecurringBillShape.Transfer || bill.ToAccountId is null || row.ToAccountId == bill.ToAccountId)
        && keys.Contains(row.Key);

    public static IReadOnlyDictionary<ScheduledOccurrence, RecurringRow> Assign(
        IReadOnlyList<ScheduledOccurrence> occurrences,
        IEnumerable<RecurringRow> rows)
    {
        var keys = occurrences
            .Select(occurrence => occurrence.Bill)
            .Distinct()
            .ToDictionary(bill => bill, PriceRiseMatcher.KeysOf);

        return rows
            .Select(row => (Row: row, Occurrence: occurrences
                .Where(occurrence => Distance(occurrence, row) <= ToleranceDays(occurrence.Bill.Cadence)
                    && Pays(occurrence.Bill, keys[occurrence.Bill], row))
                .OrderBy(occurrence => Distance(occurrence, row))
                .ThenBy(occurrence => occurrence.Bill.Id.Value)
                .FirstOrDefault()))
            .Where(claim => claim.Occurrence is not null)
            .GroupBy(claim => claim.Occurrence!)
            .ToDictionary(
                group => group.Key,
                group => group
                    .OrderBy(claim => Distance(group.Key, claim.Row))
                    .ThenBy(claim => claim.Row.Date)
                    .First()
                    .Row);
    }

    private static int Distance(ScheduledOccurrence occurrence, RecurringRow row) =>
        Math.Abs(row.Date.DayNumber - occurrence.Date.DayNumber);
}
