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
            + "must add up to the transaction amount, and the top-level categoryId is then ignored.";
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
        RequestParam(r => r.Amount, SummaryText.PositiveMoney);
        RequestParam(r => r.Date, "The date the money moved, as YYYY-MM-DD.");
        RequestParam(r => r.Lines, "Optional split lines. Their amounts must sum to the transaction amount.");
        Responses[201] = "The transaction was created. The Location header points at it.";
        Responses[400] = "Validation failed, the split lines do not add up, or the account or category is not visible to you.";
    }
}
