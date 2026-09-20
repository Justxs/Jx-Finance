using FastEndpoints;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.AddMember;

public sealed class AddMemberSummary : Summary<AddMemberEndpoint, AddMemberRequest>
{
    public AddMemberSummary()
    {
        Summary = "Add a member";
        Description = "Adds an existing user to the household by email address. From that moment they "
            + "can see every shared account, category, and transaction of the household, so treat this "
            + "as granting access to financial data rather than sending an invitation.";
        ExampleRequest = new AddMemberRequest(Guid.Empty, "partner@example.com", HouseholdRole.Member);
        Params["id"] = "The household id. Takes precedence over the id in the body.";
        RequestParam(r => r.Email, "Email address of an existing, active user.");
        RequestParam(r => r.Role, "Owner may manage the household and its members; Member may not.");
        Responses[200] = "The household with the new member included.";
        Responses[400] = "No such user, or they are already a member.";
        Responses[403] = HouseholdSummaryText.NotOwner;
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
