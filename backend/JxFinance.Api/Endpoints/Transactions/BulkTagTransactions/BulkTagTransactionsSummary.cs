using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.BulkTagTransactions;

public sealed class BulkTagTransactionsSummary
    : Summary<BulkTagTransactionsEndpoint, BulkTagTransactionsRequest>
{
    public BulkTagTransactionsSummary()
    {
        Summary = "Set the tags of several transactions";
        Description = "Replaces the whole set of tags on every listed transaction with the tags sent, "
            + "so an empty list clears them. Unlike the category operation this accepts split "
            + "transactions, because a tag belongs to the payment and not to a split line. The request is "
            + "all-or-nothing: if any id is not visible to you or any tag is not visible to you, nothing "
            + "changes. Repeated ids count once, and the amounts, categories and split lines of the "
            + "transactions are untouched.";
        ExampleRequest = new BulkTagTransactionsRequest([Guid.Empty], [Guid.Empty]);
        RequestParam(r => r.TransactionIds, "Between 1 and 200 transaction ids.");
        RequestParam(r => r.TagIds, "The tags the listed transactions should carry, at most ten; an empty list clears them.");
        Responses[200] = "The number of transactions updated.";
        Responses[400] = "Validation failed, or a tag is not visible to you.";
        Responses[404] = "At least one listed transaction is not visible to the signed-in user.";
    }
}
