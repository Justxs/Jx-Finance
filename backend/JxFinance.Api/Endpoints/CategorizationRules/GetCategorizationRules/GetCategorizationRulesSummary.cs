using FastEndpoints;

namespace JxFinance.Endpoints.CategorizationRules.GetCategorizationRules;

public sealed class GetCategorizationRulesSummary : Summary<GetCategorizationRulesEndpoint>
{
    public GetCategorizationRulesSummary()
    {
        Summary = "List categorization rules";
        Description = "Returns your own rules in the order they are evaluated, lowest position first. "
            + "Rules are personal: nobody else sees them, not even a member of a household you share an "
            + "account with. The first rule whose condition matches a description decides what the row "
            + "gets, so the order is the rule, not a detail of the list.";
        Responses[200] = "The rules of the signed-in user, in evaluation order.";
    }
}
