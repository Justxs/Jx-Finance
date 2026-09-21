using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.DeleteTransaction;

public sealed class DeleteTransactionSummary : Summary<DeleteTransactionEndpoint>
{
    public DeleteTransactionSummary()
    {
        Summary = "Delete a transaction";
        Description = "Removes the transaction and adjusts the account balance accordingly. Its split lines, "
            + "tags and attached files are kept with it, so POST /api/trash/restore brings it back whole "
            + "for the next 30 days.";
        Params["id"] = "The transaction id.";
        Responses[204] = "The transaction is gone.";
        Responses[404] = "No such transaction is visible to the signed-in user.";
    }
}
