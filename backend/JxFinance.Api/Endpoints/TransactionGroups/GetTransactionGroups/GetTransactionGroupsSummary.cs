using FastEndpoints;

namespace JxFinance.Endpoints.TransactionGroups.GetTransactionGroups;

public sealed class GetTransactionGroupsSummary : Summary<GetTransactionGroupsEndpoint>
{
    public GetTransactionGroupsSummary()
    {
        Summary = "List your transaction groups";
        Description = "Returns your own transaction groups that still hold at least one live transaction you can see, the "
            + "one with the newest member first, each with its member count and the dates of its first and last member. "
            + "Groups are personal: a housemate never sees them.";
        Responses[200] = "Your transaction groups.";
    }
}
