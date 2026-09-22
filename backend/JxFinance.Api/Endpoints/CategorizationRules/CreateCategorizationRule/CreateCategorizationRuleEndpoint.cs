using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
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
            .ClearDefaultProduces(200)
            .Produces<CategorizationRuleResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateCategorizationRuleRequest req, CancellationToken ct)
    {
        var rule = (await ruleService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.CategorizationRulesPath}/{rule.Id}", rule));
    }
}
