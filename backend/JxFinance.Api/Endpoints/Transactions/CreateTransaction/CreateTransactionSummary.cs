using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.CreateTransaction;

public sealed class CreateTransactionSummary : Summary<CreateTransactionEndpoint, CreateTransactionRequest>
{
    public CreateTransactionSummary()
    {
        Summary = "Record a transaction";
        Description = "Posts income or an expense to an account. Leave lines empty for an ordinary "
            + "transaction. To split one payment across several categories, send the lines instead: they "
            + "must add up to the transaction amount, and the top-level categoryId is then ignored. Tags "
            + "belong to the whole payment and are sent as tagIds, split or not. "
            + "A refund is an expense with a negative amount: it lowers that category's spending and raises the "
            + "balance. It takes an expense category, cannot be split, and may name the purchase it refunds in "
            + "refundOfTransactionId, which must be an expense you can see and not itself a refund.";
        ExampleRequest = new CreateTransactionRequest(
            Guid.Empty,
            Guid.Empty,
            FlowType.Expense,
            42.50m,
            new DateOnly(2026, 9, 12),
            "Weekly shop",
            null);
        RequestParam(r => r.AccountId, "The account the money moved on; must be visible to you.");
        RequestParam(r => r.CategoryId, "Optional category. Ignored when lines are supplied.");
        RequestParam(r => r.Type, SummaryText.FlowType);
        RequestParam(r => r.Amount, "Decimal string with at most two decimal places. Greater than zero for income; for an expense, negative for a refund.");
        RequestParam(r => r.RefundOfTransactionId, "Optional, only on a refund: the expense it refunds.");
        RequestParam(r => r.Date, "The date the money moved, as YYYY-MM-DD.");
        RequestParam(r => r.Lines, "Optional split lines. Their amounts must sum to the transaction amount.");
        RequestParam(r => r.TagIds, "Optional tags for the whole payment, at most ten, each visible to you.");
        RequestParam(r => r.Note, "Optional note of your own, at most 1000 characters, kept beside the bank's description and never changed by an import.");
        RequestParam(r => r.SpreadMonths, "Optional, from 2 to 36: count the amount in equal monthly slices over this many months, starting with the month of the date, or ending with it when spreadDirection is backward. Not allowed on a split or a refund.");
        RequestParam(r => r.SpreadDirection, "Optional, with spreadMonths: forward (the default) counts from the month of the date on, backward counts the months up to and including it, for a bill paid in arrears.");
        RequestParam(r => r.Place, "Optional place of your own, such as a shop and its address, at most 120 characters. Stored only while the locations feature is on.");
        RequestParam(r => r.Latitude, "Optional latitude from -90 to 90, sent together with longitude and kept to five decimals. Stored only while the locations feature is on.");
        RequestParam(r => r.Longitude, "Optional longitude from -180 to 180, sent together with latitude and kept to five decimals.");
        Responses[201] = "The transaction was created. The Location header points at it.";
        Responses[400] = "Validation failed, the split lines do not add up, a refund has lines (transaction.splitNotAllowed) or names an original that is not a visible purchase "
            + "(transaction.refundOriginalInvalid), a split is spread (transaction.splitNotAllowed) or a refund is spread (transaction.spreadRefund), "
            + "coordinates are out of range or come without their pair (transaction.locationInvalid), or the account, category or a tag is not visible to you.";
    }
}
