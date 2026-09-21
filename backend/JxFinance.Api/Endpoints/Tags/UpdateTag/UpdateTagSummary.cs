using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Tags.UpdateTag;

public sealed class UpdateTagSummary : Summary<UpdateTagEndpoint, UpdateTagRequest>
{
    public UpdateTagSummary()
    {
        Summary = "Update a tag";
        Description = "Renames a tag or moves it between personal and shared. A household member can "
            + "rename a shared tag; only its owner can change the sharing or delete it. The transactions "
            + "already marked with the tag keep it.";
        ExampleRequest = new UpdateTagRequest(Guid.Empty, "Holiday 2026", Scope.Personal, null);
        Params["id"] = "The tag id. Takes precedence over the id in the body.";
        Responses[200] = "The updated tag.";
        Responses[400] = "Validation failed, or the named household is not one of yours.";
        Responses[403] = "Only the owner can change the sharing of a tag.";
        Responses[404] = "No such tag is visible to the signed-in user.";
        Responses[409] = "The owner already has another tag with that name.";
    }
}
