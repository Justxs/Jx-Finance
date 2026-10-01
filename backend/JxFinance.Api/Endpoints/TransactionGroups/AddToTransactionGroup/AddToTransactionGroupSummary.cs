using FastEndpoints;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.TransactionGroups.AddToTransactionGroup;

public sealed class AddToTransactionGroupSummary : Summary<AddToTransactionGroupEndpoint, AddToTransactionGroupRequest>
{
    public AddToTransactionGroupSummary()
    {
        Summary = "Add transactions to a group";
        Description = "Puts the listed transactions in a group you can see; split transactions are accepted. A personal "
            + "group takes only transactions you entered, a shared group only transactions on accounts shared with its "
            + "household, and none may be in another group; a transaction already in this group is left as "
            + "it is. Nothing is written when one of them is refused.";
        ExampleRequest = new AddToTransactionGroupRequest(Guid.Empty, [Guid.Empty]);
        Params["id"] = "The group id. Takes precedence over the id in the body.";
        RequestParam(r => r.TransactionIds, $"The transactions to add, 1 to {BulkRules.MaxTransactions}.");
        Responses[204] = "The transactions are in the group.";
        Responses[400] = "Validation failed, or a transaction is on an account not shared with the group's household.";
        Responses[403] = "The group is personal and a transaction was entered by someone else.";
        Responses[404] = "You have no such group, or a transaction is not visible to you.";
        Responses[409] = "A transaction is already in another group.";
    }
}
