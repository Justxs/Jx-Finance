using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.PreviewCategorizationRun;

public sealed class PreviewCategorizationRunEndpoint(ICategorizationRuleService ruleService)
    : Endpoint<RunRulesRequest, RunRulesResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.CategorizationRules + "/run/preview");
        Group<CategorizationRulesGroup>();
    }

    public override async Task HandleAsync(RunRulesRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await ruleService.PreviewRunAsync(req, ct), ct);
}
