using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.DismissUnusualAmount;

public sealed class DismissUnusualAmountSummary : Summary<DismissUnusualAmountEndpoint>
{
    public DismissUnusualAmountSummary()
    {
        Summary = "Mark an unusual expense as not unusual";
        Description = "Keeps the flag the background check stored but stops showing it: the ledger's unusual "
            + "filter leaves the row out and the response reports unusualDismissed. The mark survives later edits "
            + "of the transaction, so correcting a typo does not bring the flag back. Only an annotation; the "
            + "transaction itself is not changed. Needs the unusualAmounts feature.";
        Params["id"] = "The transaction id.";
        Responses[204] = "The transaction is marked as not unusual.";
        Responses[404] = "No such transaction is visible to the signed-in user, or the feature is off.";
    }
}
