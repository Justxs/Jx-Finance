using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.MoveCategorizationRule;

public sealed class MoveCategorizationRuleEndpoint(ICategorizationRuleService ruleService)
    : Endpoint<MoveCategorizationRuleRequest, IReadOnlyList<CategorizationRuleResponse>>
{
    public override void Configure()
    {
        Post(ApiRoutes.CategorizationRules + "/{id}/move");
        Group<CategorizationRulesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(MoveCategorizationRuleRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await ruleService.MoveAsync(req.Id, req.Direction, ct), ct);
}
