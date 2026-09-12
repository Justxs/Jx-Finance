using FastEndpoints;

namespace JxFinance.Endpoints.Households.GetHouseholds;

public sealed class GetHouseholdsSummary : Summary<GetHouseholdsEndpoint>
{
    public GetHouseholdsSummary()
    {
        Summary = "List households";
        Description = "Returns the households you belong to, each with its member list and their roles. "
            + "Households you are not a member of are never listed.";
        Responses[200] = "The households the signed-in user belongs to.";
    }
}
