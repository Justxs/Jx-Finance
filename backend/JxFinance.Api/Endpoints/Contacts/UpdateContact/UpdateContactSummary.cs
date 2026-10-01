using FastEndpoints;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.UpdateContact;

public sealed class UpdateContactSummary : Summary<UpdateContactEndpoint, UpdateContactRequest>
{
    public UpdateContactSummary()
    {
        Summary = "Rename a person";
        Description = "Changes the name of one of your people. Their splits, payments and balances stay.";
        ExampleRequest = new UpdateContactRequest(Guid.Empty, "Jonas K.");
        Params["id"] = ContactSummaryText.Id;
        RequestParam(r => r.Name, "The new name, 1 to 100 characters.");
        Responses[200] = "The person with their balances.";
        Responses[400] = "Validation failed.";
        Responses[404] = ContactSummaryText.NotFound;
    }
}
