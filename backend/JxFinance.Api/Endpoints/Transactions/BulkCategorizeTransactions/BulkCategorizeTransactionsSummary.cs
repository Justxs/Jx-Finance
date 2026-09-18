using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;

public sealed class BulkCategorizeTransactionsSummary
    : Summary<BulkCategorizeTransactionsEndpoint, BulkCategorizeTransactionsRequest>
{
    public BulkCategorizeTransactionsSummary()
    {
        Summary = "Set the category of several transactions";
        Description = "Files every listed transaction under one category, or clears their category when "
            + "categoryId is null. The request is all-or-nothing: if any id is not visible to you, is a "
            + "split transaction, or has a type the category does not match, nothing changes. Repeated "
            + "ids count once.";
        ExampleRequest = new BulkCategorizeTransactionsRequest([Guid.Empty], Guid.Empty);
        RequestParam(r => r.TransactionIds, "Between 1 and 200 transaction ids.");
        RequestParam(r => r.CategoryId, "The category to file them under, or null to clear it.");
        Responses[200] = "The number of transactions updated.";
        Responses[400] = "Validation failed, a listed transaction is split, or the category is not visible to you or does not match a transaction's type.";
        Responses[404] = "At least one listed transaction is not visible to the signed-in user.";
    }
}
