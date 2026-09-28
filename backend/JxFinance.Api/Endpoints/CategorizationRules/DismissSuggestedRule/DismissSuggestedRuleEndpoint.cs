using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.CategorizationRules.Interfaces;

namespace JxFinance.Endpoints.CategorizationRules.DismissSuggestedRule;

public sealed class DismissSuggestedRuleEndpoint(ISuggestedRuleService suggestions)
    : Endpoint<DismissSuggestedRuleRequest>
{
    public override void Configure()
    {
        Post(ApiRoutes.CategorizationRules + "/suggested/dismiss");
        Group<CategorizationRulesGroup>();
    }

    public override async Task HandleAsync(DismissSuggestedRuleRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await suggestions.DismissAsync(req, ct), ct);
}
