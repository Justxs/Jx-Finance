using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.GetTransactions;

public sealed class GetTransactionsSummary : Summary<GetTransactionsEndpoint, GetTransactionsRequest>
{
    public GetTransactionsSummary()
    {
        Summary = "List transactions";
        Description = "Returns a page of the ledger, newest first, restricted to what you can see: your "
            + "own transactions plus those on the shared accounts of your households. Every filter is "
            + "optional and they combine with AND.";
        RequestParam(r => r.Page, "One-based page number. Defaults to 1.");
        RequestParam(r => r.PageSize, "Rows per page. Defaults to 20.");
        RequestParam(r => r.AccountId, "Keep only transactions on this account.");
        RequestParam(r => r.CategoryId, "Keep only transactions in this category, including split lines filed under it.");
        RequestParam(r => r.Type, "Income or Expense.");
        RequestParam(r => r.Search, "Case-insensitive match against the description.");
        RequestParam(r => r.DateFrom, "Inclusive start date as YYYY-MM-DD.");
        RequestParam(r => r.DateTo, "Inclusive end date as YYYY-MM-DD.");
        Responses[200] = "A page of transactions with the total row count.";
    }
}
