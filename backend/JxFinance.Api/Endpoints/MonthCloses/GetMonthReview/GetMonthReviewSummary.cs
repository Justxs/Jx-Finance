using FastEndpoints;

namespace JxFinance.Endpoints.MonthCloses.GetMonthReview;

public sealed class GetMonthReviewSummary : Summary<GetMonthReviewEndpoint>
{
    public GetMonthReviewSummary()
    {
        Summary = "Review one month for closing";
        Description = "Everything the month-end close page shows for one calendar month. checklist counts what "
            + "still needs attention: uncategorized transactions dated in the month (the same rows as the ledger "
            + "with uncategorized=true), active recurring entries due on or before the month's last day while the "
            + "recurringBills feature is on, unusual expenses not marked \"not unusual\" while the unusualAmounts "
            + "feature is on, possible duplicates dated in the month (the same rows as the ledger with duplicates=true), "
            + "and per account the date of the latest imported transaction while the import feature "
            + "is on; a disabled feature answers null. figures is the report summary of the month compared with the "
            + "previous month. budgets holds the monthly budgets with their usage as of the month's last day, "
            + "measured against today's limits, and is null while the budgets feature is off. netWorthStart and "
            + "netWorthEnd hold the last net worth snapshots before the month and on or before its last day; both are "
            + "null while the netWorth feature is off. drift is null until the month is closed. Once closed it holds "
            + "the totals frozen at the close, every category whose amount moved, and up to 100 of the transactions "
            + "and investment entries created, edited, deleted or moved out of the month since, newest first; "
            + "rowCount gives the full number. When the totals and categories match today's figures, the listed "
            + "changes left the month's figures as they were. After a change of reporting currency every figure moves, so "
            + "drift only says currencyChanged and lists nothing. Tags, attachments and notes are not part of the "
            + "figures and never count as drift.";
        Params["month"] = "The month as YYYY-MM.";
        Responses[200] = "The month review.";
        Responses[400] = "month.invalid: the month is not a YYYY-MM value between 2000 and 2999.";
    }
}
