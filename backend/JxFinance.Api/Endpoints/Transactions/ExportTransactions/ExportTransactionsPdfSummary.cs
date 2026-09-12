using FastEndpoints;
using JxFinance.Endpoints.Transactions.GetTransactions;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsPdfSummary : Summary<ExportTransactionsPdfEndpoint, GetTransactionsRequest>
{
    public ExportTransactionsPdfSummary()
    {
        Summary = "Export transactions as PDF";
        Description = "Renders the filtered ledger as a printable PDF, attached as transactions.pdf. "
            + "It takes the same filters as the list endpoint but ignores paging: every matching row is "
            + "included, so narrow the date range before exporting a large ledger.";
        RequestParam(r => r.AccountId, "Keep only transactions on this account.");
        RequestParam(r => r.CategoryId, "Keep only transactions in this category.");
        RequestParam(r => r.Type, "Income or Expense.");
        RequestParam(r => r.Search, "Case-insensitive match against the description.");
        RequestParam(r => r.DateFrom, "Inclusive start date as YYYY-MM-DD; also printed in the header.");
        RequestParam(r => r.DateTo, "Inclusive end date as YYYY-MM-DD; also printed in the header.");
        Responses[200] = "The PDF document as an attachment.";
    }
}
