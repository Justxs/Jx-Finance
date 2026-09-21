using FastEndpoints;

namespace JxFinance.Endpoints.Budgets.GetBudgets;

public sealed class GetBudgetsSummary : Summary<GetBudgetsEndpoint>
{
    public GetBudgetsSummary()
    {
        Summary = "List budgets";
        Description = "Returns every budget you can see, each with its current window, the amount spent "
            + "against it inside that window, the base limit, the amount carried over from the previous "
            + "window and the effective limit the two add up to, so the client can render progress and "
            + "explain the number without a second call.";
        Responses[200] = "The budgets visible to the signed-in user.";
    }
}
