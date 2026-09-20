using FastEndpoints;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetTransactionsSummary;

public sealed class GetTransactionsSummarySummary : Summary<GetTransactionsSummaryEndpoint, GetTransactionsSummaryRequest>
{
    public GetTransactionsSummarySummary()
    {
        Summary = "Total the filtered transactions";
        Description = "Returns the row count and the income and expense totals of every transaction the "
            + "list endpoint would return for the same filters, across all pages. Transfers are not "
            + "transactions and are never counted.";
        this.DescribeTransactionFilter();
        Responses[200] = "The count and totals of the matching transactions.";
    }
}
