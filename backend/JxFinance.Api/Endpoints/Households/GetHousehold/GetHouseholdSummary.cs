using FastEndpoints;

namespace JxFinance.Endpoints.Households.GetHousehold;

public sealed class GetHouseholdSummary : Summary<GetHouseholdEndpoint>
{
    public GetHouseholdSummary()
    {
        Summary = "Get one household";
        Description = "Returns a household with its members. A household you are not a member of is "
            + "reported as missing rather than forbidden, so the endpoint cannot be used to discover "
            + "that a given household exists.";
        Params["id"] = "The household id.";
        Responses[200] = "The household and its members.";
        Responses[404] = "No such household, or the signed-in user is not a member.";
    }
}
