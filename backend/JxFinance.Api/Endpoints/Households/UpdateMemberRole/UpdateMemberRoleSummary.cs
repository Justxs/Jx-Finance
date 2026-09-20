using FastEndpoints;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.UpdateMemberRole;

public sealed class UpdateMemberRoleSummary : Summary<UpdateMemberRoleEndpoint, UpdateMemberRoleRequest>
{
    public UpdateMemberRoleSummary()
    {
        Summary = "Change a member role";
        Description = "Promotes a member to owner or demotes an owner to member. The last owner cannot "
            + "be demoted, so a household is never left without someone who can manage it.";
        ExampleRequest = new UpdateMemberRoleRequest(Guid.Empty, Guid.Empty, HouseholdRole.Owner);
        Params["id"] = HouseholdSummaryText.Id;
        Params["userId"] = "The id of the member whose role changes.";
        Responses[200] = "The household with the updated roles.";
        Responses[400] = "That user is not a member, or the change would leave no owner.";
        Responses[403] = HouseholdSummaryText.NotOwner;
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
