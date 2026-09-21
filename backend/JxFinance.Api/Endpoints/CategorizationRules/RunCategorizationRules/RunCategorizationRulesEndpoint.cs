using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.RunCategorizationRules;

public sealed class RunCategorizationRulesEndpoint(ICategorizationRuleService ruleService)
    : Endpoint<RunRulesRequest, RunRulesResponse>
{
    public override void Configure()
    {
        Post("categorization-rules/run");
        Group<CategorizationRulesGroup>();
    }

    public override async Task HandleAsync(RunRulesRequest req, CancellationToken ct)
    {
        var result = (await ruleService.RunAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(result, ct);
    }
}
