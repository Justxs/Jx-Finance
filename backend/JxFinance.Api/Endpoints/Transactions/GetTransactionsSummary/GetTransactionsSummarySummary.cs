using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.GetTransactionsSummary;

public sealed class GetTransactionsSummarySummary : Summary<GetTransactionsSummaryEndpoint, GetTransactionsSummaryRequest>
{
    public GetTransactionsSummarySummary()
    {
        Summary = "Total the filtered transactions";
        Description = "Returns the row count and the income and expense totals of every transaction the "
            + "list endpoint would return for the same filters, across all pages. Transfers are not "
            + "transactions and are never counted.";
        RequestParam(r => r.AccountId, "Keep only transactions on this account.");
        RequestParam(r => r.CategoryId, "Keep only transactions in this category, including split lines filed under it.");
        RequestParam(r => r.Type, "Income or Expense.");
        RequestParam(r => r.Search, "Case-insensitive match against the description.");
        RequestParam(r => r.DateFrom, "Inclusive start date as YYYY-MM-DD.");
        RequestParam(r => r.DateTo, "Inclusive end date as YYYY-MM-DD.");
        Responses[200] = "The count and totals of the matching transactions.";
    }
}
