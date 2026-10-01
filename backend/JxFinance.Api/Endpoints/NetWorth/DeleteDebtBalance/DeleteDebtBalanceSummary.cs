using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.DeleteDebtBalance;

public sealed class DeleteDebtBalanceSummary : Summary<DeleteDebtBalanceEndpoint, DeleteDebtBalanceRequest>
{
    public DeleteDebtBalanceSummary()
    {
        Summary = "Delete a recorded balance of a debt";
        Description = "Removes the balance recorded for one date for good; it does not go to the trash. The outstanding "
            + "amount of the debt becomes the newest remaining balance. The last balance cannot be deleted.";
        Params["id"] = "The debt id.";
        Params["date"] = "The date of the balance, as yyyy-MM-dd.";
        Responses[204] = "Deleted.";
        Responses[400] = "debt.lastBalance when this is the only recorded balance of the debt.";
        Responses[404] = "No such debt belongs to the signed-in user, or no balance is recorded for that date.";
    }
}
