using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.DeleteDebt;

public sealed class DeleteDebtSummary : Summary<DeleteDebtEndpoint>
{
    public DeleteDebtSummary()
    {
        Summary = "Delete a debt";
        Description = "Stops tracking the debt, for instance once it is settled. Snapshots already "
            + "recorded keep the balance it had.";
        Params["id"] = "The debt id.";
        Responses[204] = "The debt is gone.";
        Responses[404] = "No such debt belongs to the signed-in user.";
    }
}
