using FastEndpoints;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.MoveCategorizationRule;

public sealed class MoveCategorizationRuleSummary
    : Summary<MoveCategorizationRuleEndpoint, MoveCategorizationRuleRequest>
{
    public MoveCategorizationRuleSummary()
    {
        Summary = "Move a rule one place up or down";
        Description = "Swaps the rule with its neighbour and answers the whole list in its new order, "
            + "so a client never has to guess what the positions became. Moving the first rule up or "
            + "the last rule down changes nothing and still answers the list. Positions stay dense: "
            + "every move renumbers them 0, 1, 2 in the order the list comes back.";
        ExampleRequest = new MoveCategorizationRuleRequest(Guid.Empty, MoveDirection.Up);
        Params["id"] = "The rule id. Takes precedence over the id in the body.";
        RequestParam(r => r.Direction, "up moves the rule earlier, down moves it later.");
        Responses[200] = "Every rule of the signed-in user, in the new evaluation order.";
        Responses[404] = "No such rule belongs to the signed-in user.";
    }
}
