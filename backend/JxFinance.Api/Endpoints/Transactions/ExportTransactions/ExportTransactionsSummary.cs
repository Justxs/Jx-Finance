using FastEndpoints;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsSummary : Summary<ExportTransactionsEndpoint, GetTransactionsRequest>
{
    public ExportTransactionsSummary()
    {
        Summary = "Export transactions as CSV";
        Description = "Returns the filtered ledger as a UTF-8 CSV attachment named transactions.csv, "
            + "with account and category names resolved. It takes the same filters as the list endpoint "
            + "but ignores paging: every matching row is included. Rows are streamed from the database "
            + "into the response, so the size of the ledger does not matter.";
        this.DescribeTransactionFilter(TransactionFilterSummary.Category);
        Responses[200] = "The CSV document as an attachment.";
    }
}
