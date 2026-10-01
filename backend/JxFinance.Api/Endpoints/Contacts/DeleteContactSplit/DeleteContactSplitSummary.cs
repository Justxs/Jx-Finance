using FastEndpoints;

namespace JxFinance.Endpoints.Contacts.DeleteContactSplit;

public sealed class DeleteContactSplitSummary : Summary<DeleteContactSplitEndpoint>
{
    public DeleteContactSplitSummary()
    {
        Summary = "Delete a split with people";
        Description = "Removes the split from every person's balance and leaves the transaction as it is. It is listed in "
            + "your trash, from where POST /api/trash/restore brings it back while its transaction exists and is not split "
            + "again.";
        Params["id"] = "The split id.";
        Responses[204] = "The split is deleted.";
        Responses[404] = "You have no such split.";
    }
}
