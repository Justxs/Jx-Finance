using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Mappers;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.CreateCategorizationRule;

public sealed class CreateCategorizationRuleEndpoint(ICategorizationRuleService ruleService)
    : Endpoint<CreateCategorizationRuleRequest, CategorizationRuleResponse, CategorizationRuleMapper>
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
        var created = (await ruleService.CreateAsync(Map.ToEntity(req), req.TagIds, ct)).ValueOrThrow();
        var rule = Map.FromEntity(created);
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.CategorizationRulesPath}/{rule.Id}", rule));
    }
}
