using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetTransactions;

public sealed class GetTransactionsSummary : Summary<GetTransactionsEndpoint, GetTransactionsRequest>
{
    public GetTransactionsSummary()
    {
        Summary = "List transactions";
        Description = "Returns a page of the ledger, newest first, restricted to what you can see: your "
            + "own transactions plus those on the shared accounts of your households. Every filter is "
            + "optional and they combine with AND.";
        this.DescribePaging();
        this.DescribeTransactionFilter();
        Responses[200] = "A page of transactions with the total row count.";
    }
}
