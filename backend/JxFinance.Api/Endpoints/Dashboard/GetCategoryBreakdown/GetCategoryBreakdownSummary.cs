using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetCategoryBreakdown;

public sealed class GetCategoryBreakdownSummary : Summary<GetCategoryBreakdownEndpoint, GetCategoryBreakdownRequest>
{
    public GetCategoryBreakdownSummary()
    {
        Summary = "Get spending split by category";
        Description = "Returns expenses for one month grouped by category, ordered by amount, for the "
            + "dashboard pie chart. Split transactions contribute to each of their lines separately. While "
            + "the investments feature is on, withholding tax and standalone fees from the investment "
            + "ledger arrive as one entry with categoryId null and syntheticGroup investmentTaxesAndFees; "
            + "localize its name and do not link it to a category. Every other entry has syntheticGroup null. "
            + "Each entry also carries comparisonAmount, the same category in the previous month, and an entry "
            + "appears when either month had spending. On the current month, which has not ended, the previous "
            + "month is cut to the same number of days, so the 1st to the 12th is compared with the 1st to the "
            + "12th; comparisonStart and comparisonEnd give the compared days.";
        RequestParam(r => r.Month, "Month to report on as YYYY-MM. Defaults to the current month.");
        Responses[200] = "One entry per category that had spending in the month.";
    }
}
