using FastEndpoints;

namespace JxFinance.Endpoints.Households.RemoveMember;

public sealed class RemoveMemberSummary : Summary<RemoveMemberEndpoint>
{
    public RemoveMemberSummary()
    {
        Summary = "Remove a member";
        Description = "Revokes a member and with them their sight of the shared data. The last owner "
            + "cannot be removed. Data the household owns stays with the household.";
        Params["id"] = "The household id.";
        Params["userId"] = "The id of the member to remove.";
        Responses[200] = "The household without that member.";
        Responses[400] = "That user is not a member, or removing them would leave no owner.";
        Responses[403] = "The signed-in user is a member but not an owner.";
        Responses[404] = "No such household, or the signed-in user is not a member.";
    }
}
