using FastEndpoints;

namespace JxFinance.Endpoints.TransactionGroups.GetTransactionGroups;

public sealed class GetTransactionGroupsSummary : Summary<GetTransactionGroupsEndpoint>
{
    public GetTransactionGroupsSummary()
    {
        Summary = "List your transaction groups";
        Description = "Returns the transaction groups you can see, your own and those shared with your households, that still hold at least one live transaction you can see, the "
            + "one with the newest member first, each with its member count and the dates of its first and last member. "
            + "A personal group is never seen by a housemate.";
        Responses[200] = "Your transaction groups.";
    }
}
