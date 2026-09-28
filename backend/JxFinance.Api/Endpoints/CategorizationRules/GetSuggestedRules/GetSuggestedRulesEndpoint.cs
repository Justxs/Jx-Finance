using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.GetSuggestedRules;

public sealed class GetSuggestedRulesEndpoint(ISuggestedRuleService suggestions)
    : Endpoint<GetSuggestedRulesRequest, IReadOnlyList<SuggestedRuleResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.CategorizationRules + "/suggested");
        Group<CategorizationRulesGroup>();
    }

    public override async Task HandleAsync(GetSuggestedRulesRequest req, CancellationToken ct) =>
        await Send.OkAsync(await suggestions.GetAsync(req.TransactionId, ct), ct);
}
