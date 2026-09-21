using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.PreviewCategorizationRun;

public sealed class PreviewCategorizationRunEndpoint(ICategorizationRuleService ruleService)
    : Endpoint<RunRulesRequest, RunRulesResponse>
{
    public override void Configure()
    {
        Post("categorization-rules/run/preview");
        Group<CategorizationRulesGroup>();
    }

    public override async Task HandleAsync(RunRulesRequest req, CancellationToken ct)
    {
        var preview = (await ruleService.PreviewRunAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(preview, ct);
    }
}
