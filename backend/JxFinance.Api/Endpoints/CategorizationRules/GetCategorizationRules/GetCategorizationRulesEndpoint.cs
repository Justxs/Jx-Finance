using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Mappers;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.GetCategorizationRules;

public sealed class GetCategorizationRulesEndpoint(ICategorizationRuleService ruleService)
    : EndpointWithoutRequest<IReadOnlyList<CategorizationRuleResponse>, CategorizationRuleMapper>
{
    public override void Configure()
    {
        Get(ApiRoutes.CategorizationRules);
        Group<CategorizationRulesGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var rules = await ruleService.GetAllAsync(ct);
        await Send.OkAsync(rules.Select(Map.FromEntity).ToList(), ct);
    }
}
