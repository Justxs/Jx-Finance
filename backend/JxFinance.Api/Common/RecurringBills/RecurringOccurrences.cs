using JxFinance.Domain.RecurringBills;

namespace JxFinance.Common.RecurringBills;

public static class RecurringOccurrences
{
    public const int MaxOccurrences = 64;

    public static IReadOnlyList<DateOnly> After(RecurringBill bill, DateOnly from, DateOnly to)
    {
        var dates = new List<DateOnly>();
        for (var date = bill.NextDueDate; date <= to && dates.Count < MaxOccurrences; date = RecurringBill.Advance(date, bill.Cadence, bill.AnchorDay))
        {
            if (date >= from)
            {
                dates.Add(date);
            }
        }

        return dates;
    }

    public static IReadOnlyList<DateOnly> Before(RecurringBill bill, DateOnly from, DateOnly to, DateOnly createdOn)
    {
        var floor = from > createdOn ? from : createdOn;
        var dates = new List<DateOnly>();
        for (var date = RecurringBill.Retreat(bill.NextDueDate, bill.Cadence, bill.AnchorDay);
             date >= floor && dates.Count < MaxOccurrences;
             date = RecurringBill.Retreat(date, bill.Cadence, bill.AnchorDay))
        {
            if (date <= to)
            {
                dates.Add(date);
            }
        }

        dates.Reverse();
        return dates;
    }
}
