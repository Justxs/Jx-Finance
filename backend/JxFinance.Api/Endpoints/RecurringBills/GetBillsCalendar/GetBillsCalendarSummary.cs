using FastEndpoints;
using JxFinance.Common.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.GetBillsCalendar;

public sealed class GetBillsCalendarSummary : Summary<GetBillsCalendarEndpoint, GetBillsCalendarRequest>
{
    public GetBillsCalendarSummary()
    {
        Summary = "Lay out one month of recurring entries";
        Description = "Answers every occurrence of your active recurring entries that falls in the month, walking each "
            + "schedule forward from its next due date and back from it, never before the entry was created. Each "
            + "occurrence has a status: paid when a ledger row with the entry's match key or name, on its account, "
            + $"lies within {RecurringMatch.PaidToleranceDays} days of the date ({RecurringMatch.WeeklyPaidToleranceDays} "
            + "for a weekly entry), each row paying at most one occurrence; overdue when it is before today and not yet "
            + "confirmed; noMatch for an earlier past date with no matching row; and due otherwise. A paid occurrence "
            + "carries the row's amount and transactionId (null for a transfer), and unconfirmed when the entry still "
            + "waits for that confirmation. Other occurrences carry the entry's amount, or the median of its newest six "
            + "matching rows within 13 months for a variable entry, marked estimated, in the account's currency; "
            + "without an account, or with one you cannot see (accountNotVisible), the amount is null. expectedOut and "
            + "expectedIn add up every expense and income occurrence in the reporting currency at the newest exchange "
            + "rate, paidOut the matched expense rows at their own reporting amounts; transfers count in none of them. "
            + "partial is true when an estimate or an amount without a fresh rate is inside a figure, and unpriced "
            + "counts the expense and income entries left out for want of an amount. Nothing is stored. Needs the "
            + "recurringBills feature.";
        RequestParam(r => r.Month, "The month to lay out as YYYY-MM, at most 12 months before or after the current one.");
        Responses[200] = "The month's occurrences, by date and name, with the month totals.";
        Responses[400] = "month.invalid when the month is missing or not YYYY-MM, range.invalid when it is more than 12 months away.";
    }
}
