using FastEndpoints;

namespace JxFinance.Endpoints.Budgets.GetBudgets;

public sealed class GetBudgetsSummary : Summary<GetBudgetsEndpoint>
{
    public GetBudgetsSummary()
    {
        Summary = "List budgets";
        Description = "Returns every budget you can see, each with the amount spent against it so far "
            + "in the current period, so the client can render progress without a second call.";
        Responses[200] = "The budgets visible to the signed-in user.";
    }
}
