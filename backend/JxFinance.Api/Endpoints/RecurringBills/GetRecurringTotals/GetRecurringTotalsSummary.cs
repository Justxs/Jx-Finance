using FastEndpoints;
using JxFinance.Common.RecurringBills;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringTotals;

public sealed class GetRecurringTotalsSummary : Summary<GetRecurringTotalsEndpoint>
{
    public GetRecurringTotalsSummary()
    {
        Summary = "Sum what recurring entries cost a month and a year";
        Description = "Adds up your active expense entries (monthlyOut, yearlyOut) and, separately, your active income "
            + "entries (monthlyIn, yearlyIn) in the reporting currency at the newest exchange rate. A weekly entry counts "
            + $"{RecurringCost.TimesPerYear(RecurringBillCadence.Weekly)} times a year, a monthly one 12, "
            + "a quarterly one 4 and a yearly one once, and a month is a twelfth of the year. A variable entry counts at the "
            + $"median of its newest {RecurringEstimate.SampleSize} matching rows within {RecurringEstimate.LookBackMonths} "
            + "months. Transfers count in none of the figures. partial is true when an estimate or an amount without a fresh "
            + "rate is inside a figure, and unpriced counts the entries left out for want of an amount. possiblyCancelled "
            + $"lists the active expense entries whose last {RecurringLapse.MissedCycles} past occurrences no ledger row paid, "
            + "matched as the calendar matches them. Nothing is stored. Needs the recurringBills feature.";
        Responses[200] = "The month and year totals and the entries that may have been cancelled.";
    }
}
