using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.DeleteTransaction;

public sealed class DeleteTransactionSummary : Summary<DeleteTransactionEndpoint>
{
    public DeleteTransactionSummary()
    {
        Summary = "Delete a transaction";
        Description = "Removes the transaction and any split lines, and adjusts the account balance "
            + "accordingly.";
        Params["id"] = "The transaction id.";
        Responses[204] = "The transaction is gone.";
        Responses[404] = "No such transaction is visible to the signed-in user.";
    }
}
