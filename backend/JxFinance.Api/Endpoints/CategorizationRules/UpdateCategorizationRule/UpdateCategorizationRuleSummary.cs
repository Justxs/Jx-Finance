using FastEndpoints;
using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Endpoints.CategorizationRules.UpdateCategorizationRule;

public sealed class UpdateCategorizationRuleSummary
    : Summary<UpdateCategorizationRuleEndpoint, UpdateCategorizationRuleRequest>
{
    public UpdateCategorizationRuleSummary()
    {
        Summary = "Update a categorization rule";
        Description = "Replaces the condition, the narrowing and the action of a rule. The tag list is "
            + "replaced whole, so an empty list clears the tags the rule would add. The position is not "
            + "part of this body; reorder with the move operation. Transactions the rule already filled "
            + "keep what they got: a rule is applied when it runs, never afterwards.";
        ExampleRequest = new UpdateCategorizationRuleRequest(
            Guid.Empty,
            "Groceries",
            DescriptionMatch.Contains,
            "MAXIMA",
            [],
            CategoryId: Guid.Empty);
        Params["id"] = "The rule id. Takes precedence over the id in the body.";
        Responses[200] = "The updated rule.";
        Responses[400] = "Validation failed, the rule sets neither a category nor a tag, or a referenced account, category or tag is not visible to you.";
        Responses[404] = "No such rule belongs to the signed-in user.";
    }
}
