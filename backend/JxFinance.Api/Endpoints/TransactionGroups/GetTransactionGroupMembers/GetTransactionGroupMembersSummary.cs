using FastEndpoints;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.TransactionGroups.GetTransactionGroupMembers;

public sealed class GetTransactionGroupMembersSummary : Summary<GetTransactionGroupMembersEndpoint, GetTransactionGroupMembersRequest>
{
    public GetTransactionGroupMembersSummary()
    {
        Summary = "List the members of a group";
        Description = "Returns the members of one of your groups that match the same filters as the ledger, newest first, "
            + "so an expanded group row shows exactly the members that made it appear. The list is not paged: at most "
            + $"{BulkRules.MaxTransactions} members are returned, and truncated says whether more matched.";
        Params["id"] = "The group id.";
        this.DescribeTransactionFilter();
        Responses[200] = "The matching members.";
        Responses[404] = "You have no such group.";
    }
}
