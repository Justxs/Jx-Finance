using FastEndpoints;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.DeleteSettlement;

public sealed class DeleteSettlementSummary : Summary<DeleteSettlementEndpoint>
{
    public DeleteSettlementSummary()
    {
        Summary = "Delete a recorded payment";
        Description = "Removes the payment from the balances. Either of the two members can delete it. A transfer "
            + "recorded with it stays, because it is a fact of the ledger with its own delete. The payment is "
            + "listed in your trash, from where POST /api/trash/restore brings it back.";
        Params["id"] = HouseholdSummaryText.Id;
        Params["settlementId"] = "The payment id.";
        Responses[204] = "The payment is deleted.";
        Responses[403] = "You are neither the payer nor the payee.";
        Responses[404] = "No such payment in a household you are a member of.";
    }
}
