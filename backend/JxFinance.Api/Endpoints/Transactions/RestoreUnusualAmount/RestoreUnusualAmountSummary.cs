using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.RestoreUnusualAmount;

public sealed class RestoreUnusualAmountSummary : Summary<RestoreUnusualAmountEndpoint>
{
    public RestoreUnusualAmountSummary()
    {
        Summary = "Mark an expense as unusual again";
        Description = "Removes the \"not unusual\" mark, so a stored flag shows in the ledger and in its unusual "
            + "filter again. The undo of POST /api/transactions/{id}/unusual/dismiss. Needs the unusualAmounts "
            + "feature.";
        Params["id"] = "The transaction id.";
        Responses[204] = "The mark is removed.";
        Responses[404] = "No such transaction is visible to the signed-in user, or the feature is off.";
    }
}
