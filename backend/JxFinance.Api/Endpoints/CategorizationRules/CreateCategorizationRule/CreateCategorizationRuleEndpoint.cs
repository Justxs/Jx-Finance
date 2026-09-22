using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.CreateCategorizationRule;

public sealed class CreateCategorizationRuleEndpoint(ICategorizationRuleService ruleService)
    : Endpoint<CreateCategorizationRuleRequest, CategorizationRuleResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.CategorizationRules);
        Group<CategorizationRulesGroup>();
        Description(d => d
            .ProducesCreated<CategorizationRuleResponse>());
    }

    public override async Task HandleAsync(CreateCategorizationRuleRequest req, CancellationToken ct)
    {
        await Send.CreatedOrProblemAsync(await ruleService.CreateAsync(req, ct), rule => $"{ApiRoutes.CategorizationRulesPath}/{rule.Id}", ct);
    }
}
