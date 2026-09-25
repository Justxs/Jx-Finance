using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.UpdateCategorizationRule;

public sealed class UpdateCategorizationRuleEndpoint(ICategorizationRuleService ruleService)
    : Endpoint<UpdateCategorizationRuleRequest, CategorizationRuleResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.CategorizationRules + "/{id}");
        Group<CategorizationRulesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateCategorizationRuleRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await ruleService.UpdateAsync(req, ct), ct);
}
