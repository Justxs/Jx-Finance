using FastEndpoints;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.DeleteHousehold;

public sealed class DeleteHouseholdSummary : Summary<DeleteHouseholdEndpoint>
{
    public DeleteHouseholdSummary()
    {
        Summary = "Delete a household";
        Description = "Disbands the household. Only an owner may do this, and only once nothing shared "
            + "still points at it: accounts, categories, and transactions shared with the household must "
            + "be made personal or removed first.";
        Params["id"] = HouseholdSummaryText.Id;
        Responses[204] = "The household is gone.";
        Responses[400] = "Shared data still belongs to the household.";
        Responses[403] = HouseholdSummaryText.NotOwner;
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
