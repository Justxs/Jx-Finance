using FastEndpoints;

namespace JxFinance.Endpoints.Reports.GetReportSummary;

public sealed class GetReportSummarySummary : Summary<GetReportSummaryEndpoint, GetReportSummaryRequest>
{
    public GetReportSummarySummary()
    {
        Summary = "Summarise income and expenses over a range";
        Description = "Returns income, expense, and net totals for an arbitrary date range, with the "
            + "per-category split. Unlike the dashboard endpoints, the window is yours to choose rather "
            + "than being pinned to calendar months. While the investments feature is on, dividends and "
            + "interest from the investment ledger count as income and withholding tax and standalone fees "
            + "as expense; buys, sells and splits never do. Those amounts have no category: they arrive as "
            + "one entry per list with categoryId null and syntheticGroup set (investmentIncome or "
            + "investmentTaxesAndFees), which a client should localize and not link to a category. "
            + "Entries of real categories, and the uncategorized entry, have syntheticGroup null. "
            + "expenseByTag splits the same expense total by tag, with one entry per tag the period "
            + "touches and a final entry with tagId null for the expenses that carry no tag. A "
            + "transaction can carry several tags and then counts once under each of them, so the tag "
            + "entries can add up to more than totalExpense; only the untagged entry is disjoint from the "
            + "rest. Investment entries carry no tag and are left out of this list. "
            + "Ask for a comparison and every figure gains its counterpart from an earlier period: "
            + "comparison holds that period's own dates and totals, every category, synthetic group and "
            + "tag entry gains comparisonAmount, and every trend point gains comparisonBucketStart, "
            + "comparisonIncome and comparisonExpense. A category, group or tag that only one of the two "
            + "periods touched is still one entry, with zero on the side that has nothing. Trend points "
            + "are paired by position, so the first bucket of the range meets the first bucket of the "
            + "earlier one; a bucket with no counterpart compares against zero. Without the parameter "
            + "every comparison field is null and the response is the one it always was. The difference "
            + "and its percentage are the client's to compute, because a change from zero has no "
            + "percentage to show.";
        RequestParam(r => r.DateFrom, "Inclusive start date as YYYY-MM-DD. Defaults to the start of the current month.");
        RequestParam(r => r.DateTo, "Inclusive end date as YYYY-MM-DD. Defaults to today.");
        Responses[200] = "Totals and the per-category split for the range.";
    }
}
