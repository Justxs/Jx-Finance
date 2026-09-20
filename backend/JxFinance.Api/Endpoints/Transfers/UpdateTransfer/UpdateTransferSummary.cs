using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Transfers.UpdateTransfer;

public sealed class UpdateTransferSummary : Summary<UpdateTransferEndpoint, UpdateTransferRequest>
{
    public UpdateTransferSummary()
    {
        Summary = "Update a transfer";
        Description = "Replaces the date, amounts, description and both accounts of a transfer. The amount rules "
            + "are those of creating one: between two currencies the received amount is required, within one "
            + "currency it may be left out and must equal the sent amount when given. Send currency and "
            + "receivedCurrency as the transfer has them; without them they default to the main currency of "
            + "the chosen accounts. You need access to both accounts the transfer has now and to both accounts "
            + "it should have afterwards. A transfer that was created or matched by a bank or broker import "
            + "holds a receipt per imported account, flagged by fromAccountImported and toAccountImported: its "
            + "date, that account's side of the transfer and the amount on that side are fixed and a change "
            + "answers value.locked, "
            + "while the description, the other account and, between currencies, the other amount stay editable.";
        ExampleRequest = new UpdateTransferRequest(Guid.Empty, Guid.Empty, Guid.Empty, 250.00m, new DateOnly(2026, 9, 12), "To savings");
        Params["id"] = "The transfer id. Takes precedence over the id in the body.";
        RequestParam(r => r.Amount, SummaryText.PositiveMoney);
        RequestParam(r => r.Date, "The date the money moved, as YYYY-MM-DD.");
        RequestParam(r => r.ReceivedAmount, "The amount that arrived. Required when the two currencies differ.");
        Responses[200] = "The updated transfer.";
        Responses[400] = "Validation failed, an account is not visible to you, a currency is not enabled, "
            + "or the change touches a value fixed by an import receipt.";
        Responses[403] = "One of the transfer's current accounts is not visible to you.";
        Responses[404] = "No such transfer is visible to the signed-in user.";
    }
}
