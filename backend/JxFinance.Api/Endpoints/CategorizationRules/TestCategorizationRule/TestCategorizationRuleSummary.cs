using FastEndpoints;
using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.TestCategorizationRule;

public sealed class TestCategorizationRuleSummary
    : Summary<TestCategorizationRuleEndpoint, TestCategorizationRuleRequest>
{
    public TestCategorizationRuleSummary()
    {
        Summary = "Try a rule against a sample description";
        Description = "Answers whether a condition that has not been saved yet would match a sample "
            + "description, and whether a sample amount falls inside the range. Nothing is read from "
            + "the ledger and nothing is written, so the form can ask this on every keystroke. The "
            + "answer separates the two halves of the condition, so a rule that fails only on the "
            + "amount can say so. The action the rule would take is already in the form, which is why "
            + "this call does not repeat it.";
        ExampleRequest = new TestCategorizationRuleRequest(
            DescriptionMatch.Contains,
            "MAXIMA",
            "Pirkinys MAXIMA X-123 VILNIUS");
        RequestParam(r => r.Match, "The comparison the draft rule uses.");
        RequestParam(r => r.Pattern, "The text the draft rule compares with.");
        RequestParam(r => r.Description, "The sample description typed into the form.");
        RequestParam(r => r.Amount, "An optional sample amount; leave it out to test the description alone.");
        RequestParam(r => r.MinAmount, "The draft rule's lowest amount.");
        RequestParam(r => r.MaxAmount, "The draft rule's highest amount.");
        Responses[200] = "Whether the whole condition matches, and each half of it separately.";
        Responses[400] = "Validation failed.";
    }
}
