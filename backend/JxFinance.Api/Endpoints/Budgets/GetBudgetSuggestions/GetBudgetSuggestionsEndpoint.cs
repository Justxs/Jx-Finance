using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Shared;

namespace JxFinance.Endpoints.Budgets.GetBudgetSuggestions;

public sealed class GetBudgetSuggestionsEndpoint(IBudgetSuggestionService suggestions)
    : Endpoint<GetBudgetSuggestionsRequest, BudgetSuggestionsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Budgets + "/suggestions");
        Group<BudgetsGroup>();
    }

    public override async Task HandleAsync(GetBudgetSuggestionsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await suggestions.GetAsync(req.Period, ct), ct);
}
