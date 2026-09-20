using FastEndpoints;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.RemoveMember;

public sealed class RemoveMemberSummary : Summary<RemoveMemberEndpoint>
{
    public RemoveMemberSummary()
    {
        Summary = "Remove a member";
        Description = "Revokes a member and with them their sight of the shared data. The last owner "
            + "cannot be removed. Data the household owns stays with the household.";
        Params["id"] = HouseholdSummaryText.Id;
        Params["userId"] = "The id of the member to remove.";
        Responses[200] = "The household without that member.";
        Responses[400] = "That user is not a member, or removing them would leave no owner.";
        Responses[403] = HouseholdSummaryText.NotOwner;
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
