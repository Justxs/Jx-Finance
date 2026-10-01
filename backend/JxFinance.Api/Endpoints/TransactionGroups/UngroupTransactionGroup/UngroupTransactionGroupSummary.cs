using FastEndpoints;

namespace JxFinance.Endpoints.TransactionGroups.UngroupTransactionGroup;

public sealed class UngroupTransactionGroupSummary : Summary<UngroupTransactionGroupEndpoint>
{
    public UngroupTransactionGroupSummary()
    {
        Summary = "Ungroup";
        Description = "Removes a group you own and keeps every member as an ordinary transaction. The group goes to the "
            + "trash with the members it held, and POST /api/trash/restore with kind transactionGroup puts back the name and "
            + "the members that are still live and in no other group.";
        Params["id"] = "The group id.";
        Responses[204] = "The group is gone and its members are ordinary transactions.";
        Responses[403] = "The group is shared with you; only its owner can ungroup it.";
        Responses[404] = "You have no such group.";
    }
}
