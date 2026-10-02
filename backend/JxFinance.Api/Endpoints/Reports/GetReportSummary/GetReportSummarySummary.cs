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
            + "expenseByPayee splits the expenses by payee, the normalized description: lowercase words with "
            + "punctuation and tokens of three or more digits dropped, so reference numbers do not split one shop. "
            + "It counts whole transactions, a split one once under its own description, and holds at most "
            + "50 entries ordered by the larger of the two amounts. label is the newest description of that payee "
            + "in the range, count the number of its transactions in the range, and payeeKey matches the payee "
            + "filter of the transaction list, whose totals then equal the amount. The expenses without a "
            + "description are one entry with payeeKey and label null. Investment entries are left out. "
            + "expenseByPlace, empty while the locations feature is off, splits the expenses the same way by place: places "
            + "that differ only in case are one entry named by the newest spelling in the range, with the average of its "
            + "stored coordinates (null when none has any), and the expenses without a place are one entry with place null. "
            + "At most 50 entries. The place filter of the transaction list matches by substring, so its totals equal the "
            + "amount unless the name is part of another place's name. "
            + "Ask for a comparison and every figure gains its counterpart from an earlier period: "
            + "comparison holds that period's own dates and totals, every category, synthetic group, "
            + "tag and payee entry gains comparisonAmount, and every trend point gains comparisonBucketStart, "
            + "comparisonIncome and comparisonExpense. A category, group, tag or payee that only one of the two "
            + "periods touched is still one entry, with zero on the side that has nothing. Trend points "
            + "are paired by position, so the first bucket of the range meets the first bucket of the "
            + "earlier one; a bucket with no counterpart compares against zero. Without the parameter "
            + "every comparison field is null and the response is the one it always was. The difference "
            + "and its percentage are the client's to compute, because a change from zero has no "
            + "percentage to show.";
        RequestParam(
            r => r.DateFrom,
            "Inclusive start date as YYYY-MM-DD, from 2000-01-01 to 2999-12-31 and not after the end date "
                + "(today when dateTo is omitted). Defaults to the first day of the end date's month.");
        RequestParam(r => r.DateTo, "Inclusive end date as YYYY-MM-DD, from 2000-01-01 to 2999-12-31. Defaults to today.");
        RequestParam(
            r => r.Comparison,
            "Which earlier period to answer beside this one: previousPeriod for the same number of days "
                + "immediately before the range, previousYear for the same range a year earlier, where a "
                + "range that ends on the last day of a month again ends on the last day of that month, so "
                + "February meets the whole of February. Omit it, or send none, for no comparison.");
        RequestParam(
            r => r.Share,
            "How to count an expense split with a household or with people: full, the default, counts it at its whole amount; mine counts "
                + "it at your own share, your part of what you paid and your share of a household split another member paid, which is dated "
                + "on the split's date while you cannot see its transaction.");
        Responses[200] = "Totals and the per-category split for the range.";
        Responses[400] = "A date falls outside 2000-01-01 to 2999-12-31, or the start is after the end (range.invalid).";
    }
}
