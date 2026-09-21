using FastEndpoints;
using JxFinance.Endpoints.CategorizationRules.Shared;

namespace JxFinance.Endpoints.CategorizationRules.PreviewCategorizationRun;

public sealed class PreviewCategorizationRunSummary : Summary<PreviewCategorizationRunEndpoint, RunRulesRequest>
{
    public PreviewCategorizationRunSummary()
    {
        Summary = "Count what a run of the rules would touch";
        Description = "Reads the ledger and answers how many rows each rule would fill in, without "
            + "writing anything. The count is the one the run will use: rules are evaluated in order "
            + "and a row belongs to the first rule that claims it, so the numbers never double-count a "
            + "row. By default only rows with no category at all are considered; split transactions "
            + "are left out, because their categories live on their lines. The matching happens in "
            + "PostgreSQL, so the size of the ledger does not decide how much the server loads.";
        ExampleRequest = new RunRulesRequest();
        RequestParam(r => r.AccountId, "Narrows the run to one account; leave it out for every account you can see.");
        RequestParam(r => r.Recategorize, "false, the default, leaves every row that already carries a category alone. true also offers those rows to the rules and replaces the category on the ones that match.");
        Responses[200] = "One entry per rule with the number of rows it would touch, and the total.";
        Responses[400] = "The named account is not visible to the signed-in user.";
    }
}
