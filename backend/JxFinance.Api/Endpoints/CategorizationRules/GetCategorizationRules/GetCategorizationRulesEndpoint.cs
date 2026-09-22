using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.GetCategorizationRules;

public sealed class GetCategorizationRulesEndpoint(ICategorizationRuleService ruleService)
    : EndpointWithoutRequest<IReadOnlyList<CategorizationRuleResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.CategorizationRules);
        Group<CategorizationRulesGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await ruleService.GetAllAsync(ct), ct);
    }
}
