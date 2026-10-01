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
            + "transaction. Tags are replaced the same way: send the full set, and an empty list or an "
            + "absent tagIds clears them. The note, spreadMonths and spreadDirection are replaced too, so leaving one out clears it. "
            + "So are place, latitude and longitude while the locations feature is on; while it is off they are ignored and the stored values kept. "
            + "Moving it to another account adjusts both balances. "
            + "A refund is an expense with a negative amount: it lowers that category's spending and raises the "
            + "balance. It takes an expense category, cannot be split, and may name the purchase it refunds in "
            + "refundOfTransactionId, which must be an expense you can see and not itself a refund.";
        ExampleRequest = new UpdateTransactionRequest(
            Guid.Empty,
            Guid.Empty,
            Guid.Empty,
            FlowType.Expense,
            42.50m,
            new DateOnly(2026, 9, 12),
            "Weekly shop",
            null);
        RequestParam(r => r.SpreadMonths, "Optional, from 2 to 36: count the amount in equal monthly slices over this many months, starting with the month of the date, or ending with it when spreadDirection is backward. Not allowed on a split or a refund.");
        RequestParam(r => r.SpreadDirection, "Optional, with spreadMonths: forward (the default) counts from the month of the date on, backward counts the months up to and including it, for a bill paid in arrears.");
        RequestParam(r => r.Place, "Optional place of your own, such as a shop and its address, at most 120 characters. Stored only while the locations feature is on.");
        RequestParam(r => r.Latitude, "Optional latitude from -90 to 90, sent together with longitude and kept to five decimals. Stored only while the locations feature is on.");
        RequestParam(r => r.Longitude, "Optional longitude from -180 to 180, sent together with latitude and kept to five decimals.");
        Params["id"] = "The transaction id. Takes precedence over the id in the body.";
        Responses[200] = "The updated transaction.";
        Responses[400] = "Validation failed, the split lines do not add up, a refund has lines (transaction.splitNotAllowed) or names an original that is not a visible purchase "
            + "(transaction.refundOriginalInvalid), a split is spread (transaction.splitNotAllowed) or a refund is spread (transaction.spreadRefund), "
            + "coordinates are out of range or come without their pair (transaction.locationInvalid), or the account, category or a tag is not visible to you.";
        Responses[404] = "No such transaction is visible to the signed-in user.";
    }
}
