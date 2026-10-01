using FastEndpoints;
using JxFinance.Domain.Trash;

namespace JxFinance.Endpoints.Trash.RestoreTransactions;

public sealed class RestoreTransactionsSummary : Summary<RestoreTransactionsEndpoint, RestoreTransactionsRequest>
{
    public RestoreTransactionsSummary()
    {
        Summary = "Restore several deleted transactions";
        Description = "The undo of POST /api/transactions/bulk-delete: brings back every listed transaction "
            + "the signed-in user deleted, each through the same checks as POST /api/trash/restore with kind "
            + "transaction, in one save. A transaction that cannot come back stays in the trash and is listed "
            + "in refused with the code that single restore would answer: restore.referenceMissing when its "
            + "account is archived or no longer visible or its category was deleted, restore.detailsLost when "
            + "its split lines are gone, restore.expired when it was deleted more than "
            + $"{DeletionEntry.RetentionDays} days ago, and resource.notFound when you deleted no such "
            + "transaction. One that is already back counts as restored, which makes the call safe to repeat. "
            + "Each one also stays restorable on its own from the trash. A read-and-write API token cannot "
            + "call it.";
        ExampleRequest = new RestoreTransactionsRequest([Guid.Empty]);
        RequestParam(r => r.TransactionIds, "Between 1 and 200 ids of deleted transactions.");
        Responses[200] = "How many transactions are back, and which stayed in the trash and why.";
        Responses[400] = "Validation failed.";
    }
}
