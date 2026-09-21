using FastEndpoints;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.RunCategorizationRules;

public sealed class RunCategorizationRulesSummary : Summary<RunCategorizationRulesEndpoint, RunRulesRequest>
{
    public RunCategorizationRulesSummary()
    {
        Summary = "Run the rules over the ledger";
        Description = "Applies the rules to the transactions the preview counted, in one database "
            + "transaction: the first rule that claims a row sets its category and adds its tags, and "
            + "no later rule touches that row again. Tags are added, never removed, so a tag somebody "
            + "put on a row by hand survives. With recategorize false, the default, a row that already "
            + "carries a category is not offered to any rule; with true, a matching row's category is "
            + "replaced. Split transactions are never touched.";
        ExampleRequest = new RunRulesRequest();
        RequestParam(r => r.AccountId, "Narrows the run to one account; leave it out for every account you can see.");
        RequestParam(r => r.Recategorize, "false, the default, leaves every row that already carries a category alone. true also offers those rows to the rules and replaces the category on the ones that match.");
        Responses[200] = "One entry per rule with the number of rows it changed, and the total.";
        Responses[400] = "The named account is not visible to the signed-in user.";
    }
}
