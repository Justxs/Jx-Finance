using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Tags.CreateTag;

public sealed class CreateTagSummary : Summary<CreateTagEndpoint, CreateTagRequest>
{
    public CreateTagSummary()
    {
        Summary = "Create a tag";
        Description = "Adds a tag that transactions can be marked with. A tag says what a payment was "
            + "for across categories — a holiday, a renovation, something to be reimbursed — so it has no "
            + "flow type and the same tag can sit on income and on an expense. Names are unique per owner, "
            + "ignoring case.";
        ExampleRequest = new CreateTagRequest("Holiday 2026", Scope.Personal, null);
        RequestParam(r => r.Name, "Display name, unique among your own tags whatever the casing.");
        RequestParam(r => r.Scope, "Personal keeps the tag private; Shared exposes it to a household.");
        RequestParam(r => r.HouseholdId, "Required when Scope is Shared; must be a household you belong to.");
        Responses[201] = "The tag was created. The Location header points at it.";
        Responses[400] = "Validation failed, or the named household is not one of yours.";
        Responses[409] = "You already have a tag with that name.";
    }
}
