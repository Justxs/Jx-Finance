using FastEndpoints;

namespace JxFinance.Endpoints.TransactionGroups.RemoveFromTransactionGroup;

public sealed class RemoveFromTransactionGroupSummary : Summary<RemoveFromTransactionGroupEndpoint>
{
    public RemoveFromTransactionGroupSummary()
    {
        Summary = "Remove a transaction from a group";
        Description = "Takes one transaction out of one of your groups, so the ledger shows it as an ordinary row again. "
            + "The group stays, even with a single member left.";
        Params["id"] = "The group id.";
        Params["transactionId"] = "The transaction to take out.";
        Responses[204] = "The transaction is no longer in the group.";
        Responses[404] = "You have no such group, or the transaction is not visible or not in it.";
    }
}
