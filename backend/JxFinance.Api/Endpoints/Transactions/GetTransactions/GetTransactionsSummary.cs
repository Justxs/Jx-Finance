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
            + "optional and they combine with AND. A refund is an expense with a negative amount; it carries refundOf "
            + "(the purchase it refunds, null when that is not visible), and a purchase carries refundedAmount, the reporting-currency total of the "
            + "visible refunds that name it.";
        this.DescribePaging();
        this.DescribeTransactionFilter();
        Responses[200] = "A page of transactions with the total row count.";
    }
}
