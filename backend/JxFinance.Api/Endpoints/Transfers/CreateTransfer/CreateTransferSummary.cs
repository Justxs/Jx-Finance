using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Transfers.CreateTransfer;

public sealed class CreateTransferSummary : Summary<CreateTransferEndpoint, CreateTransferRequest>
{
    public CreateTransferSummary()
    {
        Summary = "Create a transfer";
        Description = "Moves money from one of your accounts to another. Both balances change and "
            + "neither side counts as income or expense, so reports and budgets are left alone. The two "
            + "accounts must differ and both must be visible to you.";
        ExampleRequest = new CreateTransferRequest(Guid.Empty, Guid.Empty, 200.00m, new DateOnly(2026, 9, 12), "To savings");
        RequestParam(r => r.Amount, SummaryText.PositiveMoney);
        RequestParam(r => r.Date, "The date the money moved, as YYYY-MM-DD.");
        Responses[201] = "The transfer was created. The Location header points at it.";
        Responses[400] = "Validation failed, the accounts are the same, or one of them is not visible to you.";
    }
}
