using FastEndpoints;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.DeleteHousehold;

public sealed class DeleteHouseholdSummary : Summary<DeleteHouseholdEndpoint>
{
    public DeleteHouseholdSummary()
    {
        Summary = "Delete a household";
        Description = "Disbands the household. Only an owner may do this. Every account, category and "
            + "tag shared into it becomes personal to the member who owns it; the memberships are kept. "
            + "Which rows were shared is recorded, so the deletion is listed in the trash and "
            + "POST /api/trash/restore brings the household back and shares those rows into it again.";
        Params["id"] = HouseholdSummaryText.Id;
        Responses[204] = "The household is gone.";
        Responses[403] = HouseholdSummaryText.NotOwner;
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
