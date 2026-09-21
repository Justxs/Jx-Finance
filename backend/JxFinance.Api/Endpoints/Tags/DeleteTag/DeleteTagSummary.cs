using FastEndpoints;

namespace JxFinance.Endpoints.Tags.DeleteTag;

public sealed class DeleteTagSummary : Summary<DeleteTagEndpoint>
{
    public DeleteTagSummary()
    {
        Summary = "Delete a tag";
        Description = "Removes the tag and takes it off every transaction that carried it, the way "
            + "deleting a category leaves its transactions uncategorised. The transactions themselves, "
            + "their amounts, categories and split lines are untouched. Only the owner can delete a "
            + "shared tag.";
        Params["id"] = "The tag id.";
        Responses[204] = "The tag is gone and no transaction carries it any more.";
        Responses[403] = "Only the owner can delete a shared tag.";
        Responses[404] = "No such tag is visible to the signed-in user.";
    }
}
