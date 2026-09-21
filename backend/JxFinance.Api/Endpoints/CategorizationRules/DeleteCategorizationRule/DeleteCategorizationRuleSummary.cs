using FastEndpoints;

namespace JxFinance.Endpoints.CategorizationRules.DeleteCategorizationRule;

public sealed class DeleteCategorizationRuleSummary : Summary<DeleteCategorizationRuleEndpoint>
{
    public DeleteCategorizationRuleSummary()
    {
        Summary = "Delete a categorization rule";
        Description = "Removes the rule and the tags it would have added. The transactions it filled "
            + "in earlier keep their category and their tags, because a rule writes once and owns "
            + "nothing afterwards. The rules below it close the gap, so the positions stay 0, 1, 2 "
            + "without a hole.";
        Params["id"] = "The rule id.";
        Responses[204] = "The rule is gone and the remaining rules are renumbered.";
        Responses[404] = "No such rule belongs to the signed-in user.";
    }
}
