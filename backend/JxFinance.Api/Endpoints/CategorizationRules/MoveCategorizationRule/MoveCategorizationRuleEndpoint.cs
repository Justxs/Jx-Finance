using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Mappers;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.MoveCategorizationRule;

public sealed class MoveCategorizationRuleEndpoint(ICategorizationRuleService ruleService)
    : Endpoint<MoveCategorizationRuleRequest, IReadOnlyList<CategorizationRuleResponse>, CategorizationRuleMapper>
{
    public override void Configure()
    {
        Post(ApiRoutes.CategorizationRules + "/{id}/move");
        Group<CategorizationRulesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(MoveCategorizationRuleRequest req, CancellationToken ct)
    {
        var rules = (await ruleService.MoveAsync(req.Id, req.Direction, ct)).ValueOrThrow();
        await Send.OkAsync(rules.Select(Map.FromEntity).ToList(), ct);
    }
}
