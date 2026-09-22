using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
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

    public override async Task HandleAsync(UpdateCategorizationRuleRequest req, CancellationToken ct)
    {
        var rule = (await ruleService.UpdateAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(rule, ct);
    }
}
