using FastEndpoints;

namespace JxFinance.Endpoints.Contacts.UpdateContactSplit;

public sealed class UpdateContactSplitSummary : Summary<UpdateContactSplitEndpoint, UpdateContactSplitRequest>
{
    public UpdateContactSplitSummary()
    {
        Summary = "Change a split with people";
        Description = "Replaces the method, your part and the people with their amounts. The split first copies the "
            + "transaction's current amount, date and description, so saving it again follows a corrected transaction.";
        Params["id"] = "The split id.";
        Responses[200] = "The split as it is now.";
        Responses[400] = "Validation failed, a person is not yours, the exact amounts do not add up, or the transaction "
            + "is no longer an expense on an account you own.";
        Responses[404] = "You have no such split.";
    }
}
