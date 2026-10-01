using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetLedger;

public sealed class GetLedgerSummary : Summary<GetLedgerEndpoint, GetLedgerRequest>
{
    public GetLedgerSummary()
    {
        Summary = "List the ledger with transaction groups folded";
        Description = "Returns a page of the ledger in which the members of each of your transaction groups are folded into one "
            + "item of kind Group, and every other transaction is an item of kind Transaction. Filters apply to the members: a "
            + "group appears when at least one member matches, and its matchingCount, date range and net count only the "
            + "matching members, while memberCount counts them all. The net is the sum of the members' reporting amounts with "
            + "income positive. Sorting by date places a group at its newest matching member, by amount at the size of its "
            + "net, by description at its name, and by category or account after every transaction, by name. The total counts "
            + "ledger items, not transactions; GET /api/transactions/summary still counts transactions. A group is personal, so "
            + "a housemate sees its members on a shared account as ordinary transactions. GET /api/transactions is unchanged "
            + "and never folds anything.";
        this.DescribePaging();
        this.DescribeTransactionFilter();
        Responses[200] = "A page of ledger items with the total item count.";
    }
}
