using FastEndpoints;

namespace JxFinance.Endpoints.Transfers.DeleteTransfer;

public sealed class DeleteTransferSummary : Summary<DeleteTransferEndpoint>
{
    public DeleteTransferSummary()
    {
        Summary = "Delete a transfer";
        Description = "Reverses the transfer: both account balances go back to what they were before it.";
        Params["id"] = "The transfer id.";
        Responses[204] = "The transfer is gone and both balances are restored.";
        Responses[404] = "No such transfer is visible to the signed-in user.";
    }
}
