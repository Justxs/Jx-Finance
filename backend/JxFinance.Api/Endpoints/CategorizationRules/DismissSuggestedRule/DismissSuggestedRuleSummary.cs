using FastEndpoints;

namespace JxFinance.Endpoints.CategorizationRules.DismissSuggestedRule;

public sealed class DismissSuggestedRuleSummary : Summary<DismissSuggestedRuleEndpoint>
{
    public DismissSuggestedRuleSummary()
    {
        Summary = "Dismiss a suggested categorization rule";
        Description = "Stops offering one suggested rule to the signed-in user, on every device. The dismissal "
            + "is stored against the normalized description key and the category, not against the "
            + "transactions behind it, so later rows of the same payee do not bring the suggestion back. "
            + "Dismissing the same pair twice changes nothing. It is not a deletion and has no trash entry.";
        Responses[204] = "The suggestion will not be offered to you again.";
        Responses[400] = "Validation failed, or the category is not visible to you.";
    }
}
