using FastEndpoints;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.UpdateHousehold;

public sealed class UpdateHouseholdSummary : Summary<UpdateHouseholdEndpoint, UpdateHouseholdRequest>
{
    public UpdateHouseholdSummary()
    {
        Summary = "Rename a household";
        Description = "Changes the household name. Only an owner may do this; a plain member gets 403 "
            + "rather than 404, because membership already tells them the household exists.";
        ExampleRequest = new UpdateHouseholdRequest(Guid.Empty, "Home");
        Params["id"] = "The household id. Takes precedence over the id in the body.";
        Responses[200] = "The updated household.";
        Responses[403] = HouseholdSummaryText.NotOwner;
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
