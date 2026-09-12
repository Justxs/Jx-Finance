using FastEndpoints;

namespace JxFinance.Endpoints.Households.DeleteHousehold;

public sealed class DeleteHouseholdSummary : Summary<DeleteHouseholdEndpoint>
{
    public DeleteHouseholdSummary()
    {
        Summary = "Delete a household";
        Description = "Disbands the household. Only an owner may do this, and only once nothing shared "
            + "still points at it: accounts, categories, and transactions shared with the household must "
            + "be made personal or removed first.";
        Params["id"] = "The household id.";
        Responses[204] = "The household is gone.";
        Responses[400] = "Shared data still belongs to the household.";
        Responses[403] = "The signed-in user is a member but not an owner.";
        Responses[404] = "No such household, or the signed-in user is not a member.";
    }
}
