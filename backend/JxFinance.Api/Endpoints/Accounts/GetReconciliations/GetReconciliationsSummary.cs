using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.GetReconciliations;

public sealed class GetReconciliationsSummary : Summary<GetReconciliationsEndpoint, GetReconciliationsRequest>
{
    public GetReconciliationsSummary()
    {
        Summary = "List the reconciliations of an account";
        Description = "Returns the newest 24 statement balances recorded for the account, typed by hand or taken from "
            + "a statement import, in any currency of the account, newest date first. Only the statement's balance is stored: the ledger balance on "
            + "each date in the reconciliation's currency and the difference (statement minus ledger) are computed on every read, so an edit dated on "
            + "or before a statement date changes its difference.";
        Params["id"] = "The account id.";
        Responses[200] = "The reconciliations, newest date first.";
        Responses[404] = "No such account is visible to the signed-in user.";
    }
}
