using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Mappers;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.UpdateCategorizationRule;

public sealed class UpdateCategorizationRuleEndpoint(ICategorizationRuleService ruleService)
    : Endpoint<UpdateCategorizationRuleRequest, CategorizationRuleResponse, CategorizationRuleMapper>
{
    public override void Configure()
    {
        Put(ApiRoutes.CategorizationRules + "/{id}");
        Group<CategorizationRulesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateCategorizationRuleRequest req, CancellationToken ct)
    {
        var updated = (await ruleService.UpdateAsync(
            req.Id,
            entity => Map.Apply(req, entity),
            req.TagIds,
            ct)).ValueOrThrow();
        await Send.OkAsync(Map.FromEntity(updated), ct);
    }
}
