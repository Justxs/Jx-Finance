using FastEndpoints;

namespace JxFinance.Endpoints.CategorizationRules.GetSuggestedRules;

public sealed class GetSuggestedRulesSummary : Summary<GetSuggestedRulesEndpoint, GetSuggestedRulesRequest>
{
    public GetSuggestedRulesSummary()
    {
        Summary = "List suggested categorization rules";
        Description = "Offers a rule for a payee you keep categorizing by hand. Your own unsplit transactions "
            + "of the last 12 months are grouped by their normalized description. A group becomes a suggestion "
            + "when at least three of its rows carry the same category, none of your current rules matches "
            + "them, and no row of the group carries another category of the same flow type. The pattern is "
            + "the descriptions' common start, or else a word they all contain, and it never matches a row "
            + "of another category. Dismissed suggestions and suggestions for a full rule list are left out. "
            + "With transactionId the answer holds at most the one suggestion that row backs, and only when "
            + "it has exactly three rows, so a client can offer it once, right after the save that made it; "
            + "a row you cannot see answers an empty list. Nothing is written.";
        RequestParam(r => r.TransactionId, "A transaction just saved; answers only its suggestion, at exactly three rows.");
        Responses[200] = "The suggestions, most rows first, at most 20.";
    }
}
