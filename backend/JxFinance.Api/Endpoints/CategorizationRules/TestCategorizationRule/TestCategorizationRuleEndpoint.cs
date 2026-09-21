using FastEndpoints;
using JxFinance.Common.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.TestCategorizationRule;

public sealed class TestCategorizationRuleEndpoint
    : Endpoint<TestCategorizationRuleRequest, TestCategorizationRuleResponse>
{
    public override void Configure()
    {
        Post("categorization-rules/test");
        Group<CategorizationRulesGroup>();
    }

    public override async Task HandleAsync(TestCategorizationRuleRequest req, CancellationToken ct)
    {
        var descriptionMatches = RuleMatcher.Matches(req.Match, req.Pattern, req.Description);
        var amountMatches = req.Amount is not { } amount
            || RuleMatcher.AmountInRange(amount, req.MinAmount, req.MaxAmount);

        await Send.OkAsync(
            new TestCategorizationRuleResponse(descriptionMatches && amountMatches, descriptionMatches, amountMatches),
            ct);
    }
}
