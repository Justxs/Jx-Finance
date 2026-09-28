using FastEndpoints;

namespace JxFinance.Endpoints.Budgets.GetBudgets;

public sealed class GetBudgetsSummary : Summary<GetBudgetsEndpoint, GetBudgetsRequest>
{
    public GetBudgetsSummary()
    {
        Summary = "List budgets";
        Description = "Returns every budget you can see, each with its current window, the amount spent "
            + "against it inside that window, the base limit, the amount carried over from the previous "
            + "window and the effective limit the two add up to, so the client can render progress and "
            + "explain the number without a second call. With asOf, each budget shows the window that contains "
            + "that date instead of today's, with its spending and carry-over computed for that window; the "
            + "limit is the budget's limit today, because changes to a limit are not kept by date.";
        RequestParam(r => r.AsOf, "Date whose window to show, as YYYY-MM-DD. Defaults to today.");
        Responses[200] = "The budgets visible to the signed-in user.";
    }
}
