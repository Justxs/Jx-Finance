using FastEndpoints;

namespace JxFinance.Endpoints.Payees.DeletePayeeName;

public sealed class DeletePayeeNameSummary : Summary<DeletePayeeNameEndpoint>
{
    public DeletePayeeNameSummary()
    {
        Summary = "Remove a payee name";
        Description = "Removes a display name, so the payee reads as the bank's description again. No "
            + "transaction changes.";
        Params["id"] = "The payee name id.";
        Responses[204] = "The name is gone.";
        Responses[404] = "No such payee name belongs to the signed-in user.";
    }
}
