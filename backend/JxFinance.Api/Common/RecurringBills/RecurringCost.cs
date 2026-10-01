using JxFinance.Domain.RecurringBills;

namespace JxFinance.Common.RecurringBills;

public static class RecurringCost
{
    public const int MonthsPerYear = 12;

    public static int TimesPerYear(RecurringBillCadence cadence) => cadence switch
    {
        RecurringBillCadence.Weekly => 52,
        RecurringBillCadence.Monthly => 12,
        RecurringBillCadence.Quarterly => 4,
        RecurringBillCadence.Yearly => 1,
        _ => throw new ArgumentOutOfRangeException(nameof(cadence)),
    };

    public static decimal PerYear(decimal amount, RecurringBillCadence cadence) => amount * TimesPerYear(cadence);
}
