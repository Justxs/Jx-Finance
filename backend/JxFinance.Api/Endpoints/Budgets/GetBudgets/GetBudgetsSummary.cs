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
        RequestParam(
            r => r.Share,
            "How to count an expense split with a household or with people: full, the default, counts it at its whole amount; mine counts "
                + "it at your own share, your part of what you paid and your share of a household split another member paid, which is dated "
                + "on the split's date while you cannot see its transaction. It applies to personal budgets only: a household budget "
                + "keeps the household's figure, the same for every member.");
        Responses[200] = "The budgets visible to the signed-in user.";
    }
}
