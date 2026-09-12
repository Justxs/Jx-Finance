using FastEndpoints;
using JxFinance.Endpoints.Transactions.GetTransactions;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsSummary : Summary<ExportTransactionsEndpoint, GetTransactionsRequest>
{
    public ExportTransactionsSummary()
    {
        Summary = "Export transactions as CSV";
        Description = "Returns the filtered ledger as a UTF-8 CSV attachment named transactions.csv, "
            + "with account and category names resolved. It takes the same filters as the list endpoint "
            + "but ignores paging: every matching row is included, so narrow the date range before "
            + "exporting a large ledger.";
        RequestParam(r => r.AccountId, "Keep only transactions on this account.");
        RequestParam(r => r.CategoryId, "Keep only transactions in this category.");
        RequestParam(r => r.Type, "Income or Expense.");
        RequestParam(r => r.Search, "Case-insensitive match against the description.");
        RequestParam(r => r.DateFrom, "Inclusive start date as YYYY-MM-DD.");
        RequestParam(r => r.DateTo, "Inclusive end date as YYYY-MM-DD.");
        Responses[200] = "The CSV document as an attachment.";
    }
}
