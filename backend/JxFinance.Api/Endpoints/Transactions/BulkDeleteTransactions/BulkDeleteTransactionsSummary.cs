using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.BulkDeleteTransactions;

public sealed class BulkDeleteTransactionsSummary
    : Summary<BulkDeleteTransactionsEndpoint, BulkDeleteTransactionsRequest>
{
    public BulkDeleteTransactionsSummary()
    {
        Summary = "Delete several transactions";
        Description = "Deletes every listed transaction exactly as DELETE /api/transactions/{id} does, in one "
            + "save: each keeps its split lines, tags and files, and each gets its own trash entry, so "
            + "POST /api/trash/restore-transactions brings the whole selection back in one call and "
            + "POST /api/trash/restore brings back any one of them. Split rows and members of a transaction "
            + "group are accepted like any other row. The request is all-or-nothing: if any id is not visible "
            + "to you, nothing is deleted. Repeated ids count once. A read-and-write API token cannot call it.";
        ExampleRequest = new BulkDeleteTransactionsRequest([Guid.Empty]);
        RequestParam(r => r.TransactionIds, "Between 1 and 200 transaction ids.");
        Responses[200] = "The number of transactions deleted.";
        Responses[400] = "Validation failed.";
        Responses[404] = "At least one listed transaction is not visible to the signed-in user.";
    }
}
