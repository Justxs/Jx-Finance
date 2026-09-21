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
            + "localize its name and do not link it to a category. Every other entry has syntheticGroup null.";
        RequestParam(r => r.Month, "Month to report on as YYYY-MM. Defaults to the current month.");
        Responses[200] = "One entry per category that had spending in the month.";
    }
}
