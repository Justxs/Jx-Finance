using FastEndpoints;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.DeleteContact;

public sealed class DeleteContactSummary : Summary<DeleteContactEndpoint>
{
    public DeleteContactSummary()
    {
        Summary = "Delete a person";
        Description = "Removes the person, and with them their balances, payments and shares, from every list. Splits "
            + "they shared with others keep the other people's shares. The person is listed in your trash, from where "
            + "POST /api/trash/restore brings everything back; after 30 days the person, their payments and their "
            + "shares are purged, and a split left with nobody else goes with them.";
        Params["id"] = ContactSummaryText.Id;
        Responses[204] = "The person is deleted.";
        Responses[404] = ContactSummaryText.NotFound;
    }
}
