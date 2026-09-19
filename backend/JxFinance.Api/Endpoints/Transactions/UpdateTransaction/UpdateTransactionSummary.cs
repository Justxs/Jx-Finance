using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.UpdateTransaction;

public sealed class UpdateTransactionSummary : Summary<UpdateTransactionEndpoint, UpdateTransactionRequest>
{
    public UpdateTransactionSummary()
    {
        Summary = "Update a transaction";
        Description = "Replaces the transaction. Split lines are replaced wholesale rather than merged: "
            + "send the full set you want to keep, or omit lines to turn a split back into a plain "
            + "transaction. Moving it to another account adjusts both balances.";
        ExampleRequest = new UpdateTransactionRequest(
            Guid.Empty,
            Guid.Empty,
            Guid.Empty,
            FlowType.Expense,
            42.50m,
            new DateOnly(2026, 9, 12),
            "Weekly shop",
            null);
        Params["id"] = "The transaction id. Takes precedence over the id in the body.";
        Responses[200] = "The updated transaction.";
        Responses[400] = "Validation failed, the split lines do not add up, or the account or category is not visible to you.";
        Responses[404] = "No such transaction is visible to the signed-in user.";
    }
}
